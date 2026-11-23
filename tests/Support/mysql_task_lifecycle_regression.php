<?php

// Run with TASKORBIT_TEST_DATABASE=taskorbit_regression_test.
// All fixtures and controller writes are rolled back in one outer transaction.
require __DIR__ . '/../../vendor/autoload.php';
$app = require __DIR__ . '/../../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Http\Controllers\Api\TaskController;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$testDatabase = getenv('TASKORBIT_TEST_DATABASE');
$configuredDatabase = config('database.connections.mysql.database');
if (!$testDatabase || strcasecmp($testDatabase, (string) $configuredDatabase) === 0) {
    throw new RuntimeException('Set TASKORBIT_TEST_DATABASE to the isolated test schema, not the configured application database.');
}
config(['database.default' => 'mysql', 'database.connections.mysql.database' => $testDatabase]);
DB::purge('mysql');
$db = DB::connection('mysql');
if ($db->getDriverName() !== 'mysql' || !Schema::hasTable('task_segments')) {
    throw new RuntimeException('The isolated MySQL schema and task_segments migration are required.');
}

$assert = static function (bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
};
$controller = new TaskController();
$newUser = static function (array $settings = []) use ($db): array {
    $userId = random_int(100000, 1900000000);
    $db->table('users')->insert(['id' => $userId]);
    $now = now();
    $settingId = $db->table('slot_setting')->insertGetId(array_merge([
        'user_id' => $userId, 'working_days' => '1,2,3,4,5,6,7',
        'start_work_time' => '09:00:00', 'end_work_time' => '17:00:00',
        'start_break_time' => '13:00:00', 'end_break_time' => '14:00:00', 'status' => 1,
        'created_at' => $now, 'updated_at' => $now,
    ], $settings));
    return [$userId, $settingId];
};
$createTask = static function (int $userId, string $name, int $minutes, array $segments, ?string $endDate = null) use ($db): Task {
    $first = $segments[0];
    $last = $segments[count($segments) - 1];
    $task = Task::create([
        'user_id' => $userId, 'task_name' => $name, 'hour' => $minutes / 60,
        'start_date' => $first['segment_date'], 'end_date' => $endDate ?: $last['segment_date'],
        'start_time' => $first['start_time'], 'end_time' => $last['end_time'], 'status' => 0,
    ]);
    foreach ($segments as $index => $segment) $task->segments()->create($segment + ['sequence' => $index + 1]);
    return $task;
};
$seg = static fn (string $date, string $start, string $end, int $minutes): array => [
    'segment_date' => $date, 'start_time' => $start, 'end_time' => $end, 'allocated_minutes' => $minutes,
];
$responseData = static fn ($response): array => $response->getData(true);
$segmentSnapshot = static fn (int $taskId) => DB::table('task_segments')->where('task_id', $taskId)->orderBy('segment_date')->orderBy('sequence')->get(['segment_date', 'start_time', 'end_time', 'allocated_minutes'])->toArray();

$db->beginTransaction();
try {
    // 1. Delete only soft-deletes one task and preserves every other segment.
    [$user] = $newUser();
    $before = $createTask($user, 'Before', 60, [$seg('2030-01-07', '09:00:00', '10:00:00', 60)]);
    $target = $createTask($user, 'Delete only', 60, [$seg('2030-01-07', '10:00:00', '11:00:00', 60)]);
    $after = $createTask($user, 'After unchanged', 60, [$seg('2030-01-07', '11:00:00', '12:00:00', 60)]);
    $afterBefore = $segmentSnapshot($after->id);
    $deleteOnly = $responseData($controller->destroy(Request::create('/api/task', 'GET'), $target->id));
    $assert($deleteOnly['success'] && Task::onlyTrashed()->whereKey($target->id)->exists(), 'Delete-only did not move its target to recycle bin.');
    $assert($segmentSnapshot($after->id) == $afterBefore && $segmentSnapshot($before->id)[0]->start_time === '09:00:00', 'Delete-only changed another task schedule.');
    echo "PASS 1: delete only preserves other schedules\n";

    // 2, 3, 7. Middle deletion reflows multiple later tasks in order; earlier task stays fixed.
    [$user] = $newUser();
    $earlier = $createTask($user, 'Earlier unchanged', 60, [$seg('2030-01-08', '09:00:00', '10:00:00', 60)]);
    $middle = $createTask($user, 'Middle', 60, [$seg('2030-01-08', '10:00:00', '11:00:00', 60)]);
    $later1 = $createTask($user, 'Later one', 60, [$seg('2030-01-08', '11:00:00', '12:00:00', 60)]);
    $later2 = $createTask($user, 'Later two', 60, [$seg('2030-01-08', '12:00:00', '13:00:00', 60)]);
    $earlierBefore = $segmentSnapshot($earlier->id);
    $middleDelete = $responseData($controller->destroy(Request::create('/api/task', 'GET', ['reflow' => 'true']), $middle->id));
    $assert($middleDelete['success'], 'Middle task reflow failed.');
    $assert(($middleDelete['rescheduled'][0]['previous_segments'][0]['start_time'] ?? null) === '11:00:00' && ($middleDelete['rescheduled'][0]['segments'][0]['start_time'] ?? null) === '10:00:00', 'Reflow response did not include clear before/after segment details.');
    $assert($segmentSnapshot($earlier->id) == $earlierBefore, 'Reflow moved a task scheduled before the deleted task.');
    $assert($later1->fresh()->segments->first()->start_time === '10:00:00' && $later2->fresh()->segments->first()->start_time === '11:00:00', 'Multiple later tasks did not preserve chronological order.');
    echo "PASS 2,3,7: middle delete, chronological shifts, earlier tasks unchanged\n";

    // 4, 5. Multi-day durations remain exact and every generated segment avoids the daily break.
    [$user] = $newUser();
    $target = $createTask($user, 'Multi-day target', 60, [$seg('2030-01-09', '09:00:00', '10:00:00', 60)]);
    $multi = $createTask($user, 'Eight-hour task', 480, [
        $seg('2030-01-09', '10:00:00', '13:00:00', 180), $seg('2030-01-09', '14:00:00', '16:00:00', 120),
        $seg('2030-01-10', '09:00:00', '12:00:00', 180),
    ], '2030-01-10');
    $multiResult = $responseData($controller->destroy(Request::create('/api/task', 'GET', ['reflow' => 'true']), $target->id));
    $newSegments = $multi->fresh()->segments;
    $assert($multiResult['success'] && $newSegments->sum('allocated_minutes') === 480, 'Multi-day reflow lost duration.');
    $assert($newSegments->count() >= 3 && !$newSegments->contains(fn ($s) => $s->start_time < '14:00:00' && $s->end_time > '13:00:00'), 'Multi-day reflow crossed a configured break.');
    echo "PASS 4,5: multi-day duration preserved and breaks remain free\n";

    // 6. Weekend and holiday dates are skipped during reflow.
    [$user, $settingId] = $newUser(['working_days' => '1,2,3,4,5']);
    $db->table('holiday')->insert(['setting_id' => $settingId, 'holiday_name' => 'Regression holiday', 'holiday_date' => '2030-01-14', 'created_at' => now(), 'updated_at' => now()]);
    $target = $createTask($user, 'Friday target', 30, [$seg('2030-01-11', '16:30:00', '17:00:00', 30)]);
    $later = $createTask($user, 'After weekend and holiday', 120, [
        $seg('2030-01-15', '09:00:00', '11:00:00', 120),
    ], '2030-01-15');
    $skipResult = $responseData($controller->destroy(Request::create('/api/task', 'GET', ['reflow' => 'true']), $target->id));
    $dates = $later->fresh()->segments->pluck('segment_date')->map(fn ($date) => $date->format('Y-m-d'))->unique()->values()->all();
    $assert($skipResult['success'] && $dates === ['2030-01-11', '2030-01-15'], 'Reflow scheduled during a weekend or holiday.');
    echo "PASS 6: weekends and holidays skipped\n";

    // 8. An impossible later allocation rolls the complete delete/reflow back with task identity in the error.
    [$user] = $newUser();
    $target = $createTask($user, 'Rollback target', 60, [$seg('2030-01-16', '09:00:00', '10:00:00', 60)]);
    $fits = $createTask($user, 'Fits before failure', 60, [$seg('2030-01-16', '10:00:00', '11:00:00', 60)]);
    $impossible = $createTask($user, 'Cannot fit', 500, [$seg('2030-01-16', '11:00:00', '11:30:00', 500)]);
    $rollback = $responseData($controller->destroy(Request::create('/api/task', 'GET', ['reflow' => 'true']), $target->id));
    $assert(!$rollback['success'] && str_contains($rollback['message'], (string) $impossible->id), 'Failed reflow did not name the task that could not fit.');
    $assert(Task::whereKey($target->id)->exists() && $segmentSnapshot($fits->id)[0]->start_time === '10:00:00' && $segmentSnapshot($impossible->id)[0]->allocated_minutes === 500, 'Failed reflow did not restore every old row and segment.');
    echo "PASS 8: failed reflow rolls back and identifies the blocked task\n";

    // 9. Original restore works when all original segments are free.
    [$user] = $newUser();
    $restoreFree = $createTask($user, 'Restore original', 60, [$seg('2030-01-17', '09:00:00', '10:00:00', 60)]);
    $restoreFree->delete();
    $freePreview = $responseData($controller->previewRestore(Request::create('/api/task', 'POST'), $restoreFree->id));
    $freeResult = $responseData($controller->restoreData(Request::create('/api/task', 'POST', ['mode' => 'original']), $restoreFree->id));
    $assert($freePreview['can_restore_original'] && $freeResult['success'] && !Task::onlyTrashed()->whereKey($restoreFree->id)->exists(), 'Original schedule restore failed although free.');
    echo "PASS 9: original restore succeeds when free\n";

    // 10, 11. Occupied original time is previewed; alternate allocation can be confirmed.
    [$user] = $newUser();
    $restoreConflict = $createTask($user, 'Restore with conflict', 60, [$seg('2030-01-18', '09:00:00', '10:00:00', 60)]);
    $restoreConflict->delete();
    $createTask($user, 'New occupant', 60, [$seg('2030-01-18', '09:00:00', '10:00:00', 60)]);
    $conflictPreview = $responseData($controller->previewRestore(Request::create('/api/task', 'POST'), $restoreConflict->id));
    $originalAttempt = $responseData($controller->restoreData(Request::create('/api/task', 'POST', ['mode' => 'original']), $restoreConflict->id));
    $rescheduled = $responseData($controller->restoreData(Request::create('/api/task', 'POST', ['mode' => 'reschedule']), $restoreConflict->id));
    $assert(!$conflictPreview['can_restore_original'] && str_contains($conflictPreview['original_conflict'], 'New occupant') && $conflictPreview['rescheduled_segments'][0]['start_time'] === '10:00:00', 'Restore preview did not identify the blocker and propose the next available period.');
    $assert(!$originalAttempt['success'] && $rescheduled['success'] && $restoreConflict->fresh()->segments->first()->start_time === '10:00:00', 'Restore conflict fallback did not safely reschedule.');
    echo "PASS 10,11: conflict preview and reschedule restore\n";

    // 11c. Restore at original times can safely move the occupying and subsequent tasks.
    [$user] = $newUser();
    $restoreKeepTime = $createTask($user, 'Restore keep original time', 60, [$seg('2030-01-20', '09:00:00', '10:00:00', 60)]);
    $restoreKeepTime->delete();
    $restoreBlocker = $createTask($user, 'Original time blocker', 60, [$seg('2030-01-20', '09:00:00', '10:00:00', 60)]);
    $restoreLater = $createTask($user, 'Following task', 60, [$seg('2030-01-20', '10:00:00', '11:00:00', 60)]);
    $movePreview = $responseData($controller->previewRestore(Request::create('/api/task', 'POST'), $restoreKeepTime->id));
    $moveResult = $responseData($controller->restoreData(Request::create('/api/task', 'POST', ['mode' => 'original_reflow']), $restoreKeepTime->id));
    $assert($movePreview['can_restore_original_by_moving_tasks'] && count($movePreview['original_reflow_tasks']) === 2, 'Preview did not show all tasks that would move to keep the original time.');
    $assert($moveResult['success'] && $restoreKeepTime->fresh()->segments->first()->start_time === '09:00:00' && $restoreBlocker->fresh()->segments->first()->start_time === '10:00:00' && $restoreLater->fresh()->segments->first()->start_time === '11:00:00', 'Restore at original time did not reflow conflicting and later tasks in order.');
    echo "PASS 11c: restore to original time moves conflicts and later tasks\n";

    // 11d. Failed original-time reflow rolls back and leaves the deleted task safely in the bin.
    [$user] = $newUser(['end_work_time' => '10:00:00', 'start_break_time' => null, 'end_break_time' => null]);
    $restoreNoRoom = $createTask($user, 'Restore no room', 60, [$seg('2030-01-20', '09:00:00', '10:00:00', 60)]);
    $restoreNoRoom->delete();
    $noRoomOccupant = $createTask($user, 'Cannot move occupant', 60, [$seg('2030-01-20', '09:00:00', '10:00:00', 60)]);
    $noRoomPreview = $responseData($controller->previewRestore(Request::create('/api/task', 'POST'), $restoreNoRoom->id));
    $originalReflowFailure = $responseData($controller->restoreData(Request::create('/api/task', 'POST', ['mode' => 'original_reflow']), $restoreNoRoom->id));
    $assert(!$noRoomPreview['can_restore_original_by_moving_tasks'] && str_contains($noRoomPreview['original_reflow_message'], "Cannot move occupant") && !$originalReflowFailure['success'] && Task::onlyTrashed()->whereKey($restoreNoRoom->id)->exists() && $noRoomOccupant->fresh()->segments->first()->start_time === '09:00:00', 'Failed original-time reflow was not clearly previewed or partially changed data.');
    echo "PASS 11d: failed original-time reflow rolls back cleanly\n";

    // 11b. Mixed bulk restore validates original conflicts and applies the chosen reschedule mode.
    [$user] = $newUser();
    $bulkRestoreOriginal = $createTask($user, 'Bulk restore original', 60, [$seg('2030-01-19', '09:00:00', '10:00:00', 60)]);
    $bulkRestoreShifted = $createTask($user, 'Bulk restore shifted', 60, [$seg('2030-01-19', '10:00:00', '11:00:00', 60)]);
    $bulkRestoreOriginal->delete();
    $bulkRestoreShifted->delete();
    $createTask($user, 'Bulk restore occupant', 60, [$seg('2030-01-19', '10:00:00', '11:00:00', 60)]);
    $mixedRestore = $responseData($controller->restoreMultiData(Request::create('/api/task/restore-multiple', 'POST', [
        'id' => [$bulkRestoreOriginal->id, $bulkRestoreShifted->id],
        'modes' => [$bulkRestoreOriginal->id => 'original', $bulkRestoreShifted->id => 'reschedule'],
    ])));
    $assert($mixedRestore['success'] && !Task::onlyTrashed()->whereIn('id', [$bulkRestoreOriginal->id, $bulkRestoreShifted->id])->exists(), 'Mixed bulk restore did not apply explicit per-task choices.');
    $assert($bulkRestoreOriginal->fresh()->segments->first()->start_time === '09:00:00' && $bulkRestoreShifted->fresh()->segments->first()->start_time === '11:00:00', 'Mixed bulk restore overwrote an original task or failed to move the conflicted task.');
    echo "PASS 11b: mixed bulk original and reschedule choices\n";

    // 12. Insufficient restore capacity leaves the row and original segments in recycle bin.
    [$user] = $newUser();
    $restoreFull = $createTask($user, 'No restore capacity', 480, [$seg('2030-01-21', '09:00:00', '17:00:00', 480)]);
    $restoreFull->delete();
    $createTask($user, 'Fills before break', 240, [$seg('2030-01-21', '09:00:00', '13:00:00', 240)]);
    $createTask($user, 'Fills after break', 180, [$seg('2030-01-21', '14:00:00', '17:00:00', 180)]);
    $noFitPreview = $responseData($controller->previewRestore(Request::create('/api/task', 'POST'), $restoreFull->id));
    $noFitRestore = $responseData($controller->restoreData(Request::create('/api/task', 'POST', ['mode' => 'reschedule']), $restoreFull->id));
    $assert(!$noFitPreview['rescheduled_segments'] && !$noFitRestore['success'] && Task::onlyTrashed()->whereKey($restoreFull->id)->exists(), 'Failed restore did not leave the task safely deleted.');
    echo "PASS 12: insufficient restore capacity keeps task in recycle bin\n";

    // 12b. Explicit extension works and rechecks a preview if another task takes its proposed slot.
    [$user] = $newUser();
    $restoreExtend = $createTask($user, 'Restore with date extension', 60, [$seg('2030-01-22', '09:00:00', '10:00:00', 60)]);
    $restoreExtend->delete();
    $createTask($user, 'Fills the allowed day', 420, [
        $seg('2030-01-22', '09:00:00', '13:00:00', 240),
        $seg('2030-01-22', '14:00:00', '17:00:00', 180),
    ]);
    $extendPreview = $responseData($controller->previewRestore(Request::create('/api/task', 'POST'), $restoreExtend->id));
    $assert(($extendPreview['extended_rescheduled_segments'][0]['segment_date'] ?? null) === '2030-01-23' && ($extendPreview['extended_rescheduled_segments'][0]['start_time'] ?? null) === '09:00:00', 'Extended restore preview did not select the first available working period.');
    $createTask($user, 'Takes the preview slot', 60, [$seg('2030-01-23', '09:00:00', '10:00:00', 60)]);
    $extendResult = $responseData($controller->restoreData(Request::create('/api/task', 'POST', [
        'mode' => 'reschedule_extend', 'segments' => $extendPreview['extended_rescheduled_segments'],
    ]), $restoreExtend->id));
    $assert(($extendPreview['extended_end_date'] ?? null) === '2030-01-23' && $extendResult['success'] && !Task::onlyTrashed()->whereKey($restoreExtend->id)->exists(), 'Explicit extended-range restore did not preview and restore the next working period.');
    $assert(\Carbon\Carbon::parse($restoreExtend->fresh()->end_date)->format('Y-m-d') === '2030-01-23' && $restoreExtend->fresh()->segments->sum('allocated_minutes') === 60 && $restoreExtend->fresh()->segments->first()->start_time === '10:00:00', 'Extended-range restore did not reallocate a newly occupied preview slot while preserving duration.');
    echo "PASS 12b: extended restore rechecks and reallocates a newly occupied preview slot\n";

    // 13. Permanent delete cascades to task_segments using the real FK.
    [$user] = $newUser();
    $permanent = $createTask($user, 'Permanent delete', 60, [$seg('2030-01-22', '09:00:00', '10:00:00', 60)]);
    $permanentId = $permanent->id;
    $permanent->delete();
    $permanentResult = $responseData($controller->taskDeletePermanant($permanentId));
    $assert($permanentResult['success'] && !DB::table('task')->where('id', $permanentId)->exists() && !DB::table('task_segments')->where('task_id', $permanentId)->exists(), 'Permanent delete did not cascade to segments.');
    echo "PASS 13: permanent delete removes task and segments\n";

    // 14. Bulk delete/reflow is ordered and transactional.
    [$user] = $newUser();
    $bulkTarget1 = $createTask($user, 'Bulk target one', 60, [$seg('2030-01-23', '09:00:00', '10:00:00', 60)]);
    $bulkTarget2 = $createTask($user, 'Bulk target two', 60, [$seg('2030-01-23', '11:00:00', '12:00:00', 60)]);
    $bulkLater = $createTask($user, 'Bulk later', 60, [$seg('2030-01-23', '12:00:00', '13:00:00', 60)]);
    $bulkResult = $responseData($controller->multidelete(Request::create('/api/task/multidelete', 'POST', ['id' => [$bulkTarget1->id, $bulkTarget2->id], 'reflow' => true])));
    $assert($bulkResult['success'] && Task::onlyTrashed()->whereIn('id', [$bulkTarget1->id, $bulkTarget2->id])->count() === 2 && $bulkLater->fresh()->segments->first()->start_time === '09:00:00', 'Bulk delete/reflow failed or was not ordered.');
    echo "PASS 14: bulk delete and reflow\n";

    // A failure for a second owner must roll back already planned groups too.
    [$userA, $settingA] = $newUser();
    [$userB, $settingB] = $newUser();
    $ownerOrder = [$userA => [$userA, $settingA], $userB => [$userB, $settingB]];
    ksort($ownerOrder, SORT_NUMERIC);
    $orderedOwners = array_values($ownerOrder);
    $db->table('slot_setting')->where('id', $orderedOwners[1][1])->update(['status' => 0]);
    $targets = [];
    $laterTasks = [];
    foreach ($orderedOwners as $index => [$owner]) {
        $date = $index === 0 ? '2030-01-24' : '2030-01-25';
        $targets[] = $createTask($owner, "Bulk rollback target {$index}", 60, [$seg($date, '09:00:00', '10:00:00', 60)]);
        $laterTasks[] = $createTask($owner, "Bulk rollback later {$index}", 60, [$seg($date, '10:00:00', '11:00:00', 60)]);
    }
    $rollbackIds = array_map(fn ($task) => $task->id, $targets);
    $beforeLater = array_map(fn ($task) => $segmentSnapshot($task->id), $laterTasks);
    $bulkFailure = $responseData($controller->multidelete(Request::create('/api/task/multidelete', 'POST', ['id' => $rollbackIds, 'reflow' => true])));
    $assert(!$bulkFailure['success'], 'Bulk reflow with incomplete settings unexpectedly succeeded.');
    foreach ($targets as $index => $task) {
        $assert(Task::whereKey($task->id)->exists() && $segmentSnapshot($laterTasks[$index]->id) == $beforeLater[$index], 'Bulk failure left a partially deleted or reflowed group.');
    }
    echo "PASS 14b: cross-owner bulk reflow failure rolls back all groups\n";

    $db->rollBack();
    echo "PASS: lifecycle regression fixtures rolled back from the isolated test schema\n";
} catch (Throwable $error) {
    if ($db->transactionLevel() > 0) $db->rollBack();
    throw $error;
}
