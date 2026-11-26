<?php

// Run with TASKORBIT_TEST_DATABASE=taskorbit_regression_test.
// All fixtures and controller writes are rolled back in one outer transaction.
require __DIR__ . '/../../vendor/autoload.php';
$app = require __DIR__ . '/../../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Http\Controllers\Api\TaskController;
use App\Models\Task;
use App\Models\SlotSetting;
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
    $db->table('users')->insert([
        'id' => $userId,
        'first_name' => 'Task',
        'last_name' => 'Regression',
        'password' => 'isolated-test-only',
    ]);
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

$verificationFailures = [];
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

    // 15. Edit previews ignore the edited task's own saved segments and never persist preview rows.
    [$user] = $newUser(['start_break_time' => null, 'end_break_time' => null]);
    $editTarget = $createTask($user, 'Edit target', 300, [$seg('2030-01-27', '09:00:00', '14:00:00', 300)], '2030-01-28');
    $editOther = $createTask($user, 'Other task', 60, [$seg('2030-01-27', '14:00:00', '15:00:00', 60)], '2030-01-28');
    $editOriginal = $segmentSnapshot($editTarget->id);
    $editPreview = $responseData($controller->previewTaskSchedule(Request::create('/api/task/' . $editTarget->id . '/schedule-preview', 'POST', [
        'hour' => 4, 'start_date' => '2030-01-27', 'end_date' => '2030-01-28', 'start_time' => '09:00', 'auto_schedule' => true, 'reflow_mode' => 'keep',
    ]), $editTarget->id));
    $assert($editPreview['success'] && $editPreview['total_allocated_minutes'] === 240 && $segmentSnapshot($editTarget->id) == $editOriginal && $editOther->fresh()->segments->first()->start_time === '14:00:00', 'Edit preview counted the task itself or changed saved data.');
    echo "PASS 15: edit preview excludes self and rolls preview writes back\n";

    // 16. A duration reduction can backfill later tasks into the released slot.
    [$user] = $newUser(['start_break_time' => null, 'end_break_time' => null]);
    $editTarget = $createTask($user, 'Duration reduced', 300, [$seg('2030-01-29', '09:00:00', '14:00:00', 300)], '2030-01-30');
    $backfillTask = $createTask($user, 'Move earlier', 120, [$seg('2030-01-29', '14:00:00', '16:00:00', 120)], '2030-01-30');
    $editData = ['task_name' => $editTarget->task_name, 'hour' => 4, 'start_date' => '2030-01-29', 'end_date' => '2030-01-30', 'start_time' => '09:00', 'auto_schedule' => true, 'schedule_changed' => true, 'reflow_mode' => 'backfill'];
    $keepPreview = $responseData($controller->previewTaskSchedule(Request::create('/api/task/' . $editTarget->id . '/schedule-preview', 'POST', array_merge($editData, ['reflow_mode' => 'keep'])), $editTarget->id));
    $keepSaved = $responseData($controller->update(Request::create('/api/task/' . $editTarget->id . '/update', 'POST', array_merge($editData, ['reflow_mode' => 'keep'])), $editTarget->id));
    $assert($keepPreview['success'] && $keepPreview['affected_tasks'] === [] && $keepSaved['success'] && $backfillTask->fresh()->segments->first()->start_time === '14:00:00', 'Duration decrease keep mode changed another task.');
    $backfillPreview = $responseData($controller->previewTaskSchedule(Request::create('/api/task/' . $editTarget->id . '/schedule-preview', 'POST', $editData), $editTarget->id));
    $backfillAfterPreview = $segmentSnapshot($backfillTask->id);
    $backfillSaved = $responseData($controller->update(Request::create('/api/task/' . $editTarget->id . '/update', 'POST', $editData), $editTarget->id));
    $assert($keepPreview['success'] && $keepPreview['affected_tasks'] === [] && $backfillAfterPreview[0]->start_time === '14:00:00' && $backfillPreview['success'] && $backfillPreview['affected_tasks'][0]['segments'][0]['start_time'] === '13:00:00' && $backfillSaved['success'] && $backfillTask->fresh()->segments->first()->start_time === '13:00:00', 'Duration decrease failed: ' . json_encode(['after_preview' => $backfillAfterPreview, 'keep' => $keepPreview, 'preview' => $backfillPreview, 'save' => $backfillSaved, 'stored' => $segmentSnapshot($backfillTask->id)]));
    echo "PASS 16: duration decrease backfills later tasks into released working time\n";

    // 17. A duration increase cascades later tasks forward across the next date.
    [$user] = $newUser(['start_break_time' => null, 'end_break_time' => null]);
    $editTarget = $createTask($user, 'Duration increased', 240, [$seg('2030-01-31', '09:00:00', '13:00:00', 240)], '2030-02-01');
    $forwardOne = $createTask($user, 'Forward one', 120, [$seg('2030-01-31', '13:00:00', '15:00:00', 120)], '2030-02-01');
    $forwardTwo = $createTask($user, 'Forward two', 60, [$seg('2030-01-31', '15:00:00', '16:00:00', 60)], '2030-02-01');
    $editData = ['task_name' => $editTarget->task_name, 'hour' => 6, 'start_date' => '2030-01-31', 'end_date' => '2030-02-01', 'start_time' => '09:00', 'auto_schedule' => true, 'schedule_changed' => true, 'reflow_mode' => 'forward'];
    $forwardPreview = $responseData($controller->previewTaskSchedule(Request::create('/api/task/' . $editTarget->id . '/schedule-preview', 'POST', $editData), $editTarget->id));
    $forwardSaveData = array_merge($editData, [
        'reflow_mode' => 'mixed', 'reflow_task_ids' => $forwardPreview['suggested_task_ids'] ?? [],
        'reflow_task_modes' => $forwardPreview['suggested_task_modes'] ?? [],
        'schedule_preview_token' => $forwardPreview['schedule_preview_token'] ?? null,
    ]);
    $forwardSaved = $responseData($controller->update(Request::create('/api/task/' . $editTarget->id . '/update', 'POST', $forwardSaveData), $editTarget->id));
    $assert($forwardPreview['success'] && count($forwardPreview['affected_tasks']) === 2 && $forwardSaved['success'] && $forwardOne->fresh()->segments->first()->start_time === '15:00:00' && $forwardTwo->fresh()->segments->first()->segment_date->format('Y-m-d') === '2030-02-01', 'Duration increase did not cascade later tasks forward: ' . json_encode(['preview' => $forwardPreview, 'save' => $forwardSaved, 'one' => $segmentSnapshot($forwardOne->id), 'two' => $segmentSnapshot($forwardTwo->id)]));
    echo "PASS 17: duration increase cascades tasks forward across dates\n";

    // 18. A failed edit cascade restores the edited task and every later segment.
    [$user] = $newUser(['start_break_time' => null, 'end_break_time' => null]);
    $editTarget = $createTask($user, 'Rollback edit', 60, [$seg('2030-02-02', '09:00:00', '10:00:00', 60)], '2030-02-02');
    $cannotMove = $createTask($user, 'Cannot fit deadline', 600, [$seg('2030-02-02', '10:00:00', '20:00:00', 600)], '2030-02-02');
    $oldTargetSegments = $segmentSnapshot($editTarget->id);
    $oldBlockedSegments = $segmentSnapshot($cannotMove->id);
    $failedEdit = $responseData($controller->update(Request::create('/api/task/' . $editTarget->id . '/update', 'POST', [
        'task_name' => $editTarget->task_name, 'hour' => 6, 'start_date' => '2030-02-02', 'end_date' => '2030-02-02', 'start_time' => '09:00', 'auto_schedule' => true, 'schedule_changed' => true, 'reflow_mode' => 'forward',
    ]), $editTarget->id));
    $assert(!$failedEdit['success'] && $segmentSnapshot($editTarget->id) == $oldTargetSegments && $segmentSnapshot($cannotMove->id) == $oldBlockedSegments, 'Failed edit cascade did not roll back all schedule changes.');
    echo "PASS 18: failed edit cascade rolls back every affected task\n";

    // 19. Manual edit preview preserves the chosen range and splits around the configured break.
    [$user] = $newUser();
    $editTarget = $createTask($user, 'Manual edit', 60, [$seg('2030-02-04', '09:00:00', '10:00:00', 60)]);
    $manualEdit = ['task_name' => $editTarget->task_name, 'hour' => 3, 'start_date' => '2030-02-04', 'end_date' => '2030-02-04', 'start_time' => '11:00', 'end_time' => '15:00', 'auto_schedule' => false, 'schedule_changed' => true, 'reflow_mode' => 'keep'];
    $manualPreview = $responseData($controller->previewTaskSchedule(Request::create('/api/task/' . $editTarget->id . '/schedule-preview', 'POST', $manualEdit), $editTarget->id));
    $manualSaved = $responseData($controller->update(Request::create('/api/task/' . $editTarget->id . '/update', 'POST', $manualEdit), $editTarget->id));
    $assert($manualPreview['success'] && count($manualPreview['segments']) === 2 && $manualPreview['segments'][0]['end_time'] === '13:00:00' && $manualPreview['segments'][1]['start_time'] === '14:00:00' && $manualSaved['success'] && $editTarget->fresh()->segments->sum('allocated_minutes') === 180, 'Manual edit did not preview/save the exact range with the break respected.');
    echo "PASS 19: manual edit previews and saves break-safe segments\n";

    // 20. Manually chosen affected-task starts are previewed and applied through the shared allocator.
    [$user] = $newUser(['start_break_time' => null, 'end_break_time' => null]);
    $editTarget = $createTask($user, 'Manual target', 60, [$seg('2030-02-05', '09:00:00', '10:00:00', 60)], '2030-02-06');
    $manualMove = $createTask($user, 'Chosen task', 60, [$seg('2030-02-05', '10:00:00', '11:00:00', 60)], '2030-02-06');
    $unselectedMove = $createTask($user, 'Leave this task', 60, [$seg('2030-02-05', '11:00:00', '12:00:00', 60)], '2030-02-06');
    $manualMoveData = [
        'task_name' => $editTarget->task_name, 'hour' => 1, 'start_date' => '2030-02-05', 'end_date' => '2030-02-06', 'start_time' => '09:00',
        'auto_schedule' => true, 'schedule_changed' => true, 'reflow_mode' => 'manual', 'reflow_task_ids' => [$manualMove->id],
        'reflow_task_schedules' => [['task_id' => $manualMove->id, 'start_date' => '2030-02-05', 'start_time' => '12:00']],
    ];
    $manualMovePreview = $responseData($controller->previewTaskSchedule(Request::create('/api/task/' . $editTarget->id . '/schedule-preview', 'POST', $manualMoveData), $editTarget->id));
    $manualMoveSaved = $responseData($controller->update(Request::create('/api/task/' . $editTarget->id . '/update', 'POST', $manualMoveData), $editTarget->id));
    $manualMovePlans = collect($manualMovePreview['affected_tasks'])->keyBy('id');
    $assert($manualMovePreview['success'] && count($manualMovePreview['affected_tasks']) === 2 && $manualMovePlans[$manualMove->id]['segments'][0]['start_time'] === '12:00:00' && $manualMovePlans[$unselectedMove->id]['mode'] === 'keep' && $manualMoveSaved['success'] && $manualMove->fresh()->segments->first()->start_time === '12:00:00' && $unselectedMove->fresh()->segments->first()->start_time === '11:00:00', 'Manual placement preview did not show the moved and unchanged tasks or apply only the selected move.');
    echo "PASS 20: selected affected task can be manually placed at a preferred time\n";

    // 21. Editing only task details leaves its multi-segment schedule untouched.
    [$user] = $newUser();
    $detailsOnly = $createTask($user, 'Details only', 120, [
        $seg('2030-02-07', '09:00:00', '11:00:00', 120),
    ]);
    $detailsBefore = $segmentSnapshot($detailsOnly->id);
    $detailsUpdate = $responseData($controller->update(Request::create('/api/task/' . $detailsOnly->id . '/update', 'POST', [
        'task_name' => 'Renamed task', 'hour' => 2, 'start_date' => '2030-02-07', 'end_date' => '2030-02-07', 'start_time' => '09:00', 'end_time' => '11:00',
        'auto_schedule' => false, 'schedule_changed' => false,
    ]), $detailsOnly->id));
    $assert($detailsUpdate['success'] && $detailsOnly->fresh()->task_name === 'Renamed task' && $segmentSnapshot($detailsOnly->id) == $detailsBefore, 'Metadata-only task edit recalculated or altered saved segments.');
    echo "PASS 21: metadata-only edit preserves task segments\n";

    // 22. Increasing a task with backward reflow should use earlier free time when available.
    [$user] = $newUser(['start_break_time' => null, 'end_break_time' => null]);
    $editTarget = $createTask($user, 'Increase and backfill', 240, [$seg('2030-02-09', '11:00:00', '15:00:00', 240)], '2030-02-10');
    $backwardTask = $createTask($user, 'Move before target', 120, [$seg('2030-02-09', '15:00:00', '17:00:00', 120)], '2030-02-10');
    $backwardData = ['task_name' => $editTarget->task_name, 'hour' => 6, 'start_date' => '2030-02-09', 'end_date' => '2030-02-10', 'start_time' => '11:00', 'auto_schedule' => true, 'schedule_changed' => true, 'reflow_mode' => 'backfill'];
    $backwardPreview = $responseData($controller->previewTaskSchedule(Request::create('/api/task/' . $editTarget->id . '/schedule-preview', 'POST', $backwardData), $editTarget->id));
    $backwardSaveData = array_merge($backwardData, [
        'reflow_mode' => 'mixed', 'reflow_task_ids' => $backwardPreview['suggested_task_ids'] ?? [],
        'reflow_task_modes' => $backwardPreview['suggested_task_modes'] ?? [],
        'schedule_preview_token' => $backwardPreview['schedule_preview_token'] ?? null,
    ]);
    $backwardSaved = $responseData($controller->update(Request::create('/api/task/' . $editTarget->id . '/update', 'POST', $backwardSaveData), $editTarget->id));
    try {
        $previewBackwardSegment = $backwardPreview['affected_tasks'][0]['segments'][0] ?? [];
        $previewUpdatedSegments = collect($backwardPreview['segments'] ?? [])->sortBy(fn ($segment) => $segment['segment_date'] . '|' . $segment['start_time'])->values();
        $savedEditedSegments = $editTarget->fresh()->segments->sortBy(fn ($segment) => $segment->segment_date->format('Y-m-d') . '|' . $segment->start_time)->values();
        $savedBackwardSegments = $backwardTask->fresh()->segments->sortBy('sequence')->values();
        $assert(
            $backwardPreview['success'] && $previewBackwardSegment['segment_date'] === '2030-02-09' &&
            $previewBackwardSegment['start_time'] === '09:00:00' && $previewBackwardSegment['end_time'] === '11:00:00' &&
            (int) $previewBackwardSegment['allocated_minutes'] === 120 &&
            $previewUpdatedSegments->sum('allocated_minutes') === 360 && $previewUpdatedSegments->count() === 2 &&
            $previewUpdatedSegments->first()['start_time'] === '11:00:00' && $previewUpdatedSegments->first()['end_time'] === '15:00:00' &&
            $previewUpdatedSegments->last()['start_time'] === '15:00:00' && $previewUpdatedSegments->last()['end_time'] === '17:00:00' &&
            $backwardSaved['success'] && $savedBackwardSegments->sum('allocated_minutes') === 120 &&
            $savedEditedSegments->sum('allocated_minutes') === 360 && $savedEditedSegments->count() === 2 &&
            $savedBackwardSegments->first()->start_time === '09:00:00' && $savedBackwardSegments->first()->end_time === '11:00:00',
            'Backward reflow failed: ' . json_encode(['preview' => $backwardPreview, 'save' => $backwardSaved, 'stored' => $segmentSnapshot($backwardTask->id)])
        );
        echo "PASS 22: duration increase moves the next task backward into earlier free time\n";
    } catch (Throwable $failure) {
        $verificationFailures[] = $failure->getMessage();
        fwrite(STDERR, 'FAIL 22: ' . $failure->getMessage() . PHP_EOL);
    }

    // 23. A manual adjustment that encounters another task is recalculated into the next free slot.
    [$user] = $newUser(['start_break_time' => null, 'end_break_time' => null]);
    $editTarget = $createTask($user, 'Conflict target', 60, [$seg('2030-02-11', '09:00:00', '10:00:00', 60)], '2030-02-11');
    $manualMove = $createTask($user, 'Manually moved task', 60, [$seg('2030-02-11', '10:00:00', '11:00:00', 60)], '2030-02-11');
    $conflictTask = $createTask($user, 'Existing occupant', 60, [$seg('2030-02-11', '14:00:00', '15:00:00', 60)], '2030-02-11');
    $conflictData = [
        'task_name' => $editTarget->task_name, 'hour' => 1, 'start_date' => '2030-02-11', 'end_date' => '2030-02-11', 'start_time' => '09:00',
        'auto_schedule' => true, 'schedule_changed' => true, 'reflow_mode' => 'manual', 'reflow_task_ids' => [$manualMove->id],
        'reflow_task_schedules' => [['task_id' => $manualMove->id, 'start_date' => '2030-02-11', 'start_time' => '14:00']],
    ];
    $conflictPreview = $responseData($controller->previewTaskSchedule(Request::create('/api/task/' . $editTarget->id . '/schedule-preview', 'POST', $conflictData), $editTarget->id));
    $conflictSaved = $responseData($controller->update(Request::create('/api/task/' . $editTarget->id . '/update', 'POST', $conflictData), $editTarget->id));
    $assert($conflictPreview['success'] && $conflictPreview['affected_tasks'][0]['segments'][0]['start_time'] === '15:00:00' && $conflictSaved['success'] && $manualMove->fresh()->segments->first()->start_time === '15:00:00' && $conflictTask->fresh()->segments->first()->start_time === '14:00:00', 'Manual adjustment did not recalculate around the additional conflict.');
    echo "PASS 23: manual adjustment resolves a newly occupied preferred slot without moving the occupant\n";

    // 24. Backward reflow may use only time at or after the current instant on today.
    [$user, $settingId] = $newUser(['start_break_time' => null, 'end_break_time' => null]);
    $backwardSetting = SlotSetting::with('holidays')->findOrFail($settingId);
    $backwardScheduler = new \App\Services\TaskSchedulingService();
    $backwardDate = \Carbon\Carbon::parse('2030-02-12');
    $backwardAnchor = \Carbon\Carbon::parse('2030-02-12 15:00:00');
    $availableAfterNow = $backwardScheduler->allocateBackward(
        $user, $backwardDate, $backwardAnchor, 60, $backwardSetting, null,
        \Carbon\Carbon::parse('2030-02-12 14:00:00')
    );
    $pastOnly = $backwardScheduler->allocateBackward(
        $user, $backwardDate, $backwardAnchor, 60, $backwardSetting, null,
        \Carbon\Carbon::parse('2030-02-12 15:30:00')
    );
    $assert(
        $availableAfterNow !== null && $availableAfterNow[0]['start_time'] === '14:00:00' &&
        $availableAfterNow[0]['end_time'] === '15:00:00' && $pastOnly === null,
        'Backward allocation used time before the current instant or ignored valid remaining time.'
    );
    echo "PASS 24: backward allocation never schedules before the current instant\n";

    // 25. Backward reflow must not move an affected task before its original start date.
    [$user] = $newUser(['start_break_time' => null, 'end_break_time' => null]);
    $dateBoundBlocker = $createTask($user, 'Date-bound blocker', 120, [
        $seg('2030-02-13', '09:00:00', '11:00:00', 120),
    ], '2030-02-13');
    $dateBoundTarget = $createTask($user, 'Date-bound edit target', 120, [
        $seg('2030-02-13', '11:00:00', '13:00:00', 120),
    ], '2030-02-13');
    $dateBoundLater = $createTask($user, 'Cannot move before start date', 120, [
        $seg('2030-02-13', '13:00:00', '15:00:00', 120),
    ], '2030-02-13');
    $dateBoundTargetBefore = $segmentSnapshot($dateBoundTarget->id);
    $dateBoundLaterBefore = $segmentSnapshot($dateBoundLater->id);
    $dateBoundEdit = [
        'task_name' => $dateBoundTarget->task_name, 'hour' => 4,
        'start_date' => '2030-02-13', 'end_date' => '2030-02-13', 'start_time' => '11:00',
        'auto_schedule' => true, 'schedule_changed' => true, 'reflow_mode' => 'backfill',
        'reflow_task_ids' => [$dateBoundLater->id],
    ];
    $dateBoundPreview = $responseData($controller->previewTaskSchedule(
        Request::create('/api/task/' . $dateBoundTarget->id . '/schedule-preview', 'POST', $dateBoundEdit),
        $dateBoundTarget->id
    ));
    $dateBoundSave = $responseData($controller->update(
        Request::create('/api/task/' . $dateBoundTarget->id . '/update', 'POST', $dateBoundEdit),
        $dateBoundTarget->id
    ));
    $assert(
        !$dateBoundPreview['success'] && !$dateBoundSave['success'] &&
        $segmentSnapshot($dateBoundTarget->id) == $dateBoundTargetBefore &&
        $segmentSnapshot($dateBoundLater->id) == $dateBoundLaterBefore &&
        $segmentSnapshot($dateBoundBlocker->id)[0]->start_time === '09:00:00',
        'Backward reflow moved a task outside its original start-date range or failed to roll back.'
    );
    echo "PASS 25: backward reflow respects affected task start-date limits and rolls back when no valid slot exists\n";

    // 26. Manually selected reflow starts must stay within the task's original date range.
    [$user] = $newUser(['start_break_time' => null, 'end_break_time' => null]);
    $manualDateTarget = $createTask($user, 'Manual date target', 60, [
        $seg('2030-02-14', '09:00:00', '10:00:00', 60),
    ], '2030-02-15');
    $manualDateLater = $createTask($user, 'Manual date bounded task', 60, [
        $seg('2030-02-15', '09:00:00', '10:00:00', 60),
    ], '2030-02-15');
    $manualDateTargetBefore = $segmentSnapshot($manualDateTarget->id);
    $manualDateLaterBefore = $segmentSnapshot($manualDateLater->id);
    $manualDateEdit = [
        'task_name' => $manualDateTarget->task_name, 'hour' => 2,
        'start_date' => '2030-02-14', 'end_date' => '2030-02-15', 'start_time' => '09:00',
        'auto_schedule' => true, 'schedule_changed' => true, 'reflow_mode' => 'manual',
        'reflow_task_ids' => [$manualDateLater->id],
        'reflow_task_schedules' => [[
            'task_id' => $manualDateLater->id, 'start_date' => '2030-02-14', 'start_time' => '11:00',
        ]],
    ];
    $manualDatePreview = $responseData($controller->previewTaskSchedule(
        Request::create('/api/task/' . $manualDateTarget->id . '/schedule-preview', 'POST', $manualDateEdit),
        $manualDateTarget->id
    ));
    $manualDateSave = $responseData($controller->update(
        Request::create('/api/task/' . $manualDateTarget->id . '/update', 'POST', $manualDateEdit),
        $manualDateTarget->id
    ));
    $assert(
        !$manualDatePreview['success'] && !$manualDateSave['success'] &&
        $segmentSnapshot($manualDateTarget->id) == $manualDateTargetBefore &&
        $segmentSnapshot($manualDateLater->id) == $manualDateLaterBefore,
        'Manual reflow allowed a task to move before its original start date or failed to roll back.'
    );
    echo "PASS 26: manual reflow enforces task date bounds and rolls back invalid choices\n";

    // 27. Manual reflow must not silently fall back to automatic placement when a preferred start is missing.
    [$user] = $newUser(['start_break_time' => null, 'end_break_time' => null]);
    $manualRequiredTarget = $createTask($user, 'Manual placement required target', 60, [
        $seg('2030-02-16', '09:00:00', '10:00:00', 60),
    ], '2030-02-16');
    $manualRequiredLater = $createTask($user, 'Manual placement required task', 60, [
        $seg('2030-02-16', '10:00:00', '11:00:00', 60),
    ], '2030-02-16');
    $manualRequiredTargetBefore = $segmentSnapshot($manualRequiredTarget->id);
    $manualRequiredLaterBefore = $segmentSnapshot($manualRequiredLater->id);
    $manualRequiredEdit = [
        'task_name' => $manualRequiredTarget->task_name, 'hour' => 2,
        'start_date' => '2030-02-16', 'end_date' => '2030-02-16', 'start_time' => '09:00',
        'auto_schedule' => true, 'schedule_changed' => true, 'reflow_mode' => 'manual',
        'reflow_task_ids' => [$manualRequiredLater->id],
    ];
    $manualRequiredPreview = $responseData($controller->previewTaskSchedule(
        Request::create('/api/task/' . $manualRequiredTarget->id . '/schedule-preview', 'POST', $manualRequiredEdit),
        $manualRequiredTarget->id
    ));
    $manualRequiredSave = $responseData($controller->update(
        Request::create('/api/task/' . $manualRequiredTarget->id . '/update', 'POST', $manualRequiredEdit),
        $manualRequiredTarget->id
    ));
    $assert(
        $manualRequiredPreview['success'] && count($manualRequiredPreview['affected_tasks']) === 1 &&
        !$manualRequiredSave['success'] &&
        $segmentSnapshot($manualRequiredTarget->id) == $manualRequiredTargetBefore &&
        $segmentSnapshot($manualRequiredLater->id) == $manualRequiredLaterBefore,
        'Manual reflow preview did not expose tasks for placement, or save accepted an incomplete placement plan.'
    );
    echo "PASS 27: manual reflow previews placement choices but rejects incomplete saves without changes\n";

    // 28. Edit reflow must not use disabled working-time settings for manual primary schedules.
    [$user, $inactiveSettingId] = $newUser(['start_break_time' => null, 'end_break_time' => null]);
    $db->table('slot_setting')->where('id', $inactiveSettingId)->update(['status' => 0]);
    $inactiveTarget = $createTask($user, 'Inactive settings target', 60, [
        $seg('2030-02-18', '09:00:00', '10:00:00', 60),
    ], '2030-02-18');
    $inactiveLater = $createTask($user, 'Inactive settings later task', 60, [
        $seg('2030-02-18', '10:00:00', '11:00:00', 60),
    ], '2030-02-18');
    $inactiveTargetBefore = $segmentSnapshot($inactiveTarget->id);
    $inactiveLaterBefore = $segmentSnapshot($inactiveLater->id);
    $inactiveEdit = [
        'task_name' => $inactiveTarget->task_name, 'hour' => 2,
        'start_date' => '2030-02-18', 'end_date' => '2030-02-18',
        'start_time' => '09:00', 'end_time' => '11:00',
        'auto_schedule' => false, 'schedule_changed' => true, 'reflow_mode' => 'forward',
    ];
    $inactivePreview = $responseData($controller->previewTaskSchedule(
        Request::create('/api/task/' . $inactiveTarget->id . '/schedule-preview', 'POST', $inactiveEdit),
        $inactiveTarget->id
    ));
    $inactiveSave = $responseData($controller->update(
        Request::create('/api/task/' . $inactiveTarget->id . '/update', 'POST', $inactiveEdit),
        $inactiveTarget->id
    ));
    $assert(
        !$inactivePreview['success'] && !$inactiveSave['success'] &&
        $segmentSnapshot($inactiveTarget->id) == $inactiveTargetBefore &&
        $segmentSnapshot($inactiveLater->id) == $inactiveLaterBefore,
        'Edit reflow used inactive working-time settings or failed to roll back.'
    );
    echo "PASS 28: edit reflow requires active working-time settings even for manual primary schedules\n";

    // 29. A stale or unrelated task ID must not be silently ignored during selected reflow.
    [$user] = $newUser(['start_break_time' => null, 'end_break_time' => null]);
    $staleTarget = $createTask($user, 'Stale selection target', 60, [
        $seg('2030-02-19', '09:00:00', '10:00:00', 60),
    ], '2030-02-19');
    $staleAffected = $createTask($user, 'Actually affected task', 60, [
        $seg('2030-02-19', '10:00:00', '11:00:00', 60),
    ], '2030-02-19');
    $staleUnrelated = $createTask($user, 'Unrelated earlier task', 60, [
        $seg('2030-02-19', '08:00:00', '09:00:00', 60),
    ], '2030-02-19');
    $staleTargetBefore = $segmentSnapshot($staleTarget->id);
    $staleAffectedBefore = $segmentSnapshot($staleAffected->id);
    $staleEdit = [
        'task_name' => $staleTarget->task_name, 'hour' => 2,
        'start_date' => '2030-02-19', 'end_date' => '2030-02-19', 'start_time' => '09:00',
        'auto_schedule' => true, 'schedule_changed' => true, 'reflow_mode' => 'forward',
        'reflow_task_ids' => [$staleUnrelated->id],
    ];
    $stalePreview = $responseData($controller->previewTaskSchedule(
        Request::create('/api/task/' . $staleTarget->id . '/schedule-preview', 'POST', $staleEdit),
        $staleTarget->id
    ));
    $staleSave = $responseData($controller->update(
        Request::create('/api/task/' . $staleTarget->id . '/update', 'POST', $staleEdit),
        $staleTarget->id
    ));
    $assert(
        !$stalePreview['success'] && !$staleSave['success'] &&
        $segmentSnapshot($staleTarget->id) == $staleTargetBefore &&
        $segmentSnapshot($staleAffected->id) == $staleAffectedBefore &&
        $segmentSnapshot($staleUnrelated->id)[0]->start_time === '08:00:00',
        'Edit reflow silently ignored a stale/unrelated selected task ID or changed schedules.'
    );
    echo "PASS 29: stale selected-task IDs are rejected without changing any schedule\n";

    // 30. Manual placement preview must remain usable when automatic reflow cannot fit by the task deadline.
    [$user] = $newUser(['start_break_time' => null, 'end_break_time' => null]);
    $manualFallbackTarget = $createTask($user, 'Manual fallback target', 120, [
        $seg('2030-02-20', '11:00:00', '13:00:00', 120),
    ], '2030-02-20');
    $manualFallbackLater = $createTask($user, 'Manual fallback later task', 120, [
        $seg('2030-02-20', '15:00:00', '17:00:00', 120),
    ], '2030-02-20');
    $manualFallbackEdit = [
        'task_name' => $manualFallbackTarget->task_name, 'hour' => 5,
        'start_date' => '2030-02-20', 'end_date' => '2030-02-20', 'start_time' => '11:00',
        'auto_schedule' => true, 'schedule_changed' => true, 'reflow_mode' => 'manual',
    ];
    $manualFallbackPreview = $responseData($controller->previewTaskSchedule(
        Request::create('/api/task/' . $manualFallbackTarget->id . '/schedule-preview', 'POST', $manualFallbackEdit),
        $manualFallbackTarget->id
    ));
    $manualFallbackSave = $responseData($controller->update(
        Request::create('/api/task/' . $manualFallbackTarget->id . '/update', 'POST', array_merge($manualFallbackEdit, [
            'reflow_task_ids' => [$manualFallbackLater->id],
            'reflow_task_schedules' => [[
                'task_id' => $manualFallbackLater->id, 'start_date' => '2030-02-20', 'start_time' => '09:00',
            ]],
        ])),
        $manualFallbackTarget->id
    ));
    $manualFallbackSegments = $manualFallbackLater->fresh()->segments->sortBy('sequence')->values();
    $assert(
        $manualFallbackPreview['success'] && count($manualFallbackPreview['affected_tasks']) === 1 &&
        $manualFallbackSave['success'] && $manualFallbackSegments->first()->segment_date->format('Y-m-d') === '2030-02-20' &&
        $manualFallbackSegments->first()->start_time === '09:00:00' &&
        $manualFallbackSegments->sum('allocated_minutes') === 120,
        'Manual placement preview did not expose a task when automatic reflow could not fit, or the selected manual placement failed.'
    );
    echo "PASS 30: manual placement remains available when automatic reflow cannot fit by deadline\n";

    // 31. Per-task mixed placement supports backward and forward directions in one edit.
    [$user] = $newUser(['start_break_time' => null, 'end_break_time' => null]);
    $mixedTarget = $createTask($user, 'Mixed target', 240, [$seg('2030-02-21', '11:00:00', '15:00:00', 240)], '2030-02-22');
    $mixedBack = $createTask($user, 'Mixed backward', 120, [$seg('2030-02-21', '15:00:00', '17:00:00', 120)], '2030-02-22');
    $mixedForward = $createTask($user, 'Mixed forward', 120, [$seg('2030-02-22', '12:00:00', '14:00:00', 120)], '2030-02-22');
    $mixedPayload = [
        'hour' => 8, 'start_date' => '2030-02-21', 'end_date' => '2030-02-22',
        'start_time' => '11:00', 'end_time' => '17:00', 'auto_schedule' => true, 'reflow_mode' => 'mixed',
    ];
    $strategyPreview = $responseData($controller->previewTaskSchedule(Request::create('/api/task/' . $mixedTarget->id . '/schedule-preview', 'POST', $mixedPayload), $mixedTarget->id));
    $assert($strategyPreview['success'] && $strategyPreview['needs_task_strategy'] && count($strategyPreview['affected_tasks']) === 2, 'Mixed mode did not show all affected tasks for individual decisions.');
    $mixedPayload['reflow_task_ids'] = [$mixedBack->id, $mixedForward->id];
    $mixedPayload['reflow_task_modes'] = [
        ['task_id' => $mixedBack->id, 'mode' => 'backfill'],
        ['task_id' => $mixedForward->id, 'mode' => 'forward'],
    ];
    $mixedPreview = $responseData($controller->previewTaskSchedule(Request::create('/api/task/' . $mixedTarget->id . '/schedule-preview', 'POST', $mixedPayload), $mixedTarget->id));
    $assert($mixedPreview['success'], 'Mixed-direction preview failed: ' . ($mixedPreview['message'] ?? 'unknown'));
    $mixedBackPreview = collect($mixedPreview['affected_tasks'])->firstWhere('id', $mixedBack->id);
    $mixedForwardPreview = collect($mixedPreview['affected_tasks'])->firstWhere('id', $mixedForward->id);
    $assert($mixedBackPreview['segments'][0]['segment_date'] === '2030-02-21' && $mixedBackPreview['segments'][0]['start_time'] === '09:00:00', 'Backward-selected task did not use the same-day earlier slot.');
    $assert($mixedForwardPreview['segments'][0]['segment_date'] === '2030-02-22' && $mixedForwardPreview['segments'][0]['start_time'] === '11:00:00', 'Forward-selected task did not start after the edited task.');
    $mixedSavePayload = array_merge($mixedPayload, [
        'task_name' => $mixedTarget->task_name, 'description' => '', 'priority' => null,
        'status' => '1', 'schedule_changed' => true,
        'schedule_preview_token' => $mixedPreview['schedule_preview_token'],
    ]);
    $mixedSave = $responseData($controller->update(
        Request::create('/api/task/' . $mixedTarget->id . '/update', 'POST', $mixedSavePayload),
        $mixedTarget->id
    ));
    $assert($mixedSave['success'], 'Mixed-direction save failed: ' . ($mixedSave['message'] ?? 'unknown'));
    $assert(array_sum(array_map(fn ($row) => (int) $row->allocated_minutes, $segmentSnapshot($mixedBack->id))) === 120 && array_sum(array_map(fn ($row) => (int) $row->allocated_minutes, $segmentSnapshot($mixedForward->id))) === 120, 'Mixed reflow changed an affected task duration.');
    echo "PASS 31: mixed per-task backward and forward placement previews and saves correctly\n";

    // 32. A second backward task cascades into the earlier slot while chronological order is preserved.
    [$user] = $newUser(['start_break_time' => null, 'end_break_time' => null]);
    $cascadeTarget = $createTask($user, 'Backward cascade target', 240, [$seg('2030-02-21', '11:00:00', '15:00:00', 240)], '2030-02-22');
    $cascadeFirst = $createTask($user, 'Backward cascade first', 60, [$seg('2030-02-21', '15:00:00', '16:00:00', 60)], '2030-02-22');
    $cascadeSecond = $createTask($user, 'Backward cascade second', 60, [$seg('2030-02-21', '16:00:00', '17:00:00', 60)], '2030-02-22');
    $cascadePayload = [
        'task_name' => $cascadeTarget->task_name, 'description' => '', 'priority' => null, 'status' => '1',
        'hour' => 6, 'start_date' => '2030-02-21', 'end_date' => '2030-02-22',
        'start_time' => '11:00', 'end_time' => '17:00', 'auto_schedule' => true, 'schedule_changed' => true, 'reflow_mode' => 'backfill',
    ];
    $cascadePreview = $responseData($controller->previewTaskSchedule(Request::create('/api/task/' . $cascadeTarget->id . '/schedule-preview', 'POST', $cascadePayload), $cascadeTarget->id));
    $assert($cascadePreview['success'], 'Backward cascade preview failed.');
    $cascadePlans = collect($cascadePreview['affected_tasks'])->keyBy('id');
    $assert($cascadePlans[$cascadeFirst->id]['segments'][0]['start_time'] === '09:00:00' && $cascadePlans[$cascadeSecond->id]['segments'][0]['start_time'] === '10:00:00', 'Backward cascade did not preserve chronological task order.');
    echo "PASS 32: backward cascade allocates consecutive earlier slots in task order\n";

    // 33. A changed schedule after preview is rejected without saving the edited task.
    [$user] = $newUser(['start_break_time' => null, 'end_break_time' => null]);
    $staleTarget = $createTask($user, 'Stale preview target', 60, [$seg('2030-02-21', '09:00:00', '10:00:00', 60)], '2030-02-21');
    $stalePayload = [
        'task_name' => 'Stale preview target changed', 'description' => '', 'priority' => null, 'status' => '1',
        'hour' => 90 / 60, 'start_date' => '2030-02-21', 'end_date' => '2030-02-21',
        'start_time' => '09:00', 'end_time' => '10:30', 'auto_schedule' => true, 'schedule_changed' => true, 'reflow_mode' => 'keep',
    ];
    $stalePreview = $responseData($controller->previewTaskSchedule(Request::create('/api/task/' . $staleTarget->id . '/schedule-preview', 'POST', $stalePayload), $staleTarget->id));
    $assert($stalePreview['success'], 'Stale-preview fixture did not produce a valid preview.');
    $createTask($user, 'Concurrent insertion', 30, [$seg('2030-02-21', '10:30:00', '11:00:00', 30)], '2030-02-21');
    $stalePayload['schedule_preview_token'] = $stalePreview['schedule_preview_token'];
    $staleResponse = $controller->update(Request::create('/api/task/' . $staleTarget->id . '/update', 'POST', $stalePayload), $staleTarget->id);
    $staleBody = $responseData($staleResponse);
    $assert($staleResponse->getStatusCode() === 409 && ($staleBody['stale_preview'] ?? false), 'A stale edit preview was not rejected with a conflict response.');
    $assert((float) Task::findOrFail($staleTarget->id)->hour === 1.0 && $segmentSnapshot($staleTarget->id)[0]->end_time === '10:00:00', 'Stale-preview rejection modified the target task.');
    echo "PASS 33: stale preview is rejected transactionally after concurrent schedule change\n";

    // 34. Mixed mode accepts a per-task manual date/time and validates it with the shared allocator.
    [$user] = $newUser(['start_break_time' => null, 'end_break_time' => null]);
    $mixedManualTarget = $createTask($user, 'Mixed manual target', 60, [$seg('2030-02-21', '09:00:00', '10:00:00', 60)], '2030-02-21');
    $mixedManualTask = $createTask($user, 'Mixed manual task', 60, [$seg('2030-02-21', '10:00:00', '11:00:00', 60)], '2030-02-21');
    $mixedManualPayload = [
        'hour' => 2, 'start_date' => '2030-02-21', 'end_date' => '2030-02-21',
        'start_time' => '09:00', 'auto_schedule' => true, 'reflow_mode' => 'mixed',
    ];
    $mixedManualPayload['reflow_task_ids'] = [$mixedManualTask->id];
    $mixedManualPayload['reflow_task_modes'] = [['task_id' => $mixedManualTask->id, 'mode' => 'manual']];
    $mixedManualPayload['reflow_task_schedules'] = [['task_id' => $mixedManualTask->id, 'start_date' => '2030-02-21', 'start_time' => '12:00']];
    $mixedManualPreview = $responseData($controller->previewTaskSchedule(Request::create('/api/task/' . $mixedManualTarget->id . '/schedule-preview', 'POST', $mixedManualPayload), $mixedManualTarget->id));
    $assert($mixedManualPreview['success'] && $mixedManualPreview['affected_tasks'][0]['mode'] === 'manual' && $mixedManualPreview['affected_tasks'][0]['segments'][0]['start_time'] === '12:00:00', 'Mixed per-task manual placement was not previewed.');
    $mixedManualSavePayload = array_merge($mixedManualPayload, [
        'task_name' => $mixedManualTarget->task_name, 'description' => '', 'priority' => null,
        'status' => '1', 'schedule_changed' => true,
        'schedule_preview_token' => $mixedManualPreview['schedule_preview_token'],
    ]);
    $mixedManualSave = $responseData($controller->update(Request::create('/api/task/' . $mixedManualTarget->id . '/update', 'POST', $mixedManualSavePayload), $mixedManualTarget->id));
    $assert($mixedManualSave['success'] && $mixedManualTask->fresh()->segments->first()->start_time === '12:00:00', 'Mixed per-task manual placement did not save.');
    echo "PASS 34: mixed mode manually places an individual task at its selected date and time\n";

    // 35. Keeping a task in a newly conflicting slot reports the conflict and changes nothing.
    [$user] = $newUser(['end_work_time' => '11:00:00', 'start_break_time' => null, 'end_break_time' => null]);
    $keepTarget = $createTask($user, 'Keep conflict target', 60, [$seg('2030-02-21', '09:00:00', '10:00:00', 60)], '2030-02-21');
    $keepTask = $createTask($user, 'Keep conflict task', 60, [$seg('2030-02-21', '10:00:00', '11:00:00', 60)], '2030-02-21');
    $keepBefore = $segmentSnapshot($keepTask->id);
    $keepConflictPayload = [
        'hour' => 2, 'start_date' => '2030-02-21', 'end_date' => '2030-02-21',
        'start_time' => '09:00', 'auto_schedule' => true, 'reflow_mode' => 'mixed',
        'reflow_task_ids' => [], 'reflow_task_modes' => [],
    ];
    $keepConflictResponse = $controller->previewTaskSchedule(Request::create('/api/task/' . $keepTarget->id . '/schedule-preview', 'POST', $keepConflictPayload), $keepTarget->id);
    $keepConflict = $responseData($keepConflictResponse);
    $assert($keepConflictResponse->getStatusCode() === 422 && !empty($keepConflict['conflicts']) && in_array($keepTask->id, array_map('intval', array_column($keepConflict['conflicts'], 'id')), true), 'Keeping a conflicting task did not report its occupied interval: ' . json_encode($keepConflict));
    $assert((float) Task::findOrFail($keepTarget->id)->hour === 1.0 && $segmentSnapshot($keepTask->id) == $keepBefore, 'Unresolved keep conflict changed a saved schedule.');
    echo "PASS 35: unresolved keep choice reports the blocker and preserves all saved schedules\n";

    // 36. If the chosen forward direction misses a task's date limit, the preview
    // finds a valid earlier placement instead of ending at the allocator error.
    [$user] = $newUser(['end_work_time' => '19:00:00', 'start_break_time' => '13:00:00', 'end_break_time' => '14:00:00']);
    $alternativeTarget = $createTask($user, 'Alternative target', 240, [
        $seg('2030-03-04', '11:00:00', '13:00:00', 120),
        $seg('2030-03-04', '14:00:00', '16:00:00', 120),
    ], '2030-03-05');
    $deadlineTask = $createTask($user, 'Deadline task', 120, [
        $seg('2030-03-04', '16:00:00', '18:00:00', 120),
    ], '2030-03-04');
    $deadlineSegmentsBefore = $segmentSnapshot($deadlineTask->id);
    $alternativePayload = [
        'task_name' => $alternativeTarget->task_name, 'hour' => 6,
        'start_date' => '2030-03-04', 'end_date' => '2030-03-05', 'start_time' => '11:00',
        'auto_schedule' => true, 'schedule_changed' => true, 'reflow_mode' => 'forward',
    ];
    $alternativePreview = $responseData($controller->previewTaskSchedule(
        Request::create('/api/task/' . $alternativeTarget->id . '/schedule-preview', 'POST', $alternativePayload),
        $alternativeTarget->id
    ));
    $assert(
        $alternativePreview['success'] && !empty($alternativePreview['automatic_fallback']) &&
        ($alternativePreview['fallback_reason'] ?? '') !== '' &&
        ($alternativePreview['suggested_task_modes'][0]['task_id'] ?? null) === $deadlineTask->id &&
        ($alternativePreview['suggested_task_modes'][0]['mode'] ?? null) === 'backfill' &&
        ($alternativePreview['affected_tasks'][0]['segments'][0]['segment_date'] ?? null) === '2030-03-04' &&
        ($alternativePreview['affected_tasks'][0]['segments'][0]['start_time'] ?? null) === '09:00:00' &&
        ($alternativePreview['affected_tasks'][0]['segments'][0]['end_time'] ?? null) === '11:00:00' &&
        $segmentSnapshot($deadlineTask->id) == $deadlineSegmentsBefore,
        'Forward failure did not produce a safe same-day backward alternative: ' . json_encode($alternativePreview)
    );
    $alternativeSavePayload = array_merge($alternativePayload, [
        'reflow_mode' => 'mixed',
        'reflow_task_ids' => $alternativePreview['suggested_task_ids'],
        'reflow_task_modes' => $alternativePreview['suggested_task_modes'],
        'schedule_preview_token' => $alternativePreview['schedule_preview_token'],
    ]);
    $alternativeSave = $responseData($controller->update(
        Request::create('/api/task/' . $alternativeTarget->id . '/update', 'POST', $alternativeSavePayload),
        $alternativeTarget->id
    ));
    $savedTargetSegments = $alternativeTarget->fresh()->segments->sortBy('sequence')->values();
    $savedDeadlineSegment = $deadlineTask->fresh()->segments->first();
    $assert(
        $alternativeSave['success'] && $savedTargetSegments->sum('allocated_minutes') === 360 &&
        !$savedTargetSegments->contains(fn ($segment) => $segment->start_time < '14:00:00' && $segment->end_time > '13:00:00') &&
        $savedDeadlineSegment->segment_date->format('Y-m-d') === '2030-03-04' &&
        $savedDeadlineSegment->start_time === '09:00:00' && $savedDeadlineSegment->end_time === '11:00:00' &&
        $savedDeadlineSegment->allocated_minutes === 120,
        'Confirmed alternative schedule did not save exact durations and non-overlapping segments.'
    );
    echo "PASS 36: failed forward placement offers and saves a valid earlier schedule within the task date limit\n";

    // 37. When no automatic direction fits, the preview opens per-task controls
    // and leaves the target and affected task exactly as they were.
    [$user] = $newUser(['end_work_time' => '11:00:00', 'start_break_time' => null, 'end_break_time' => null]);
    $noAlternativeTarget = $createTask($user, 'No alternative target', 60, [
        $seg('2030-03-06', '09:00:00', '10:00:00', 60),
    ], '2030-03-06');
    $noAlternativeLater = $createTask($user, 'No alternative later', 60, [
        $seg('2030-03-06', '10:00:00', '11:00:00', 60),
    ], '2030-03-06');
    $noAlternativeTargetBefore = $segmentSnapshot($noAlternativeTarget->id);
    $noAlternativeLaterBefore = $segmentSnapshot($noAlternativeLater->id);
    $noAlternativePreview = $responseData($controller->previewTaskSchedule(
        Request::create('/api/task/' . $noAlternativeTarget->id . '/schedule-preview', 'POST', [
            'task_name' => $noAlternativeTarget->task_name, 'hour' => 2,
            'start_date' => '2030-03-06', 'end_date' => '2030-03-06', 'start_time' => '09:00',
            'auto_schedule' => true, 'schedule_changed' => true, 'reflow_mode' => 'forward',
        ]),
        $noAlternativeTarget->id
    ));
    $assert(
        $noAlternativePreview['success'] && !empty($noAlternativePreview['fallback_manual_required']) &&
        !empty($noAlternativePreview['needs_task_strategy']) &&
        ($noAlternativePreview['affected_tasks'][0]['id'] ?? null) === $noAlternativeLater->id &&
        ($noAlternativePreview['affected_tasks'][0]['date_limits']['end_date'] ?? null) === '2030-03-06' &&
        $segmentSnapshot($noAlternativeTarget->id) == $noAlternativeTargetBefore &&
        $segmentSnapshot($noAlternativeLater->id) == $noAlternativeLaterBefore,
        'A no-fit edit did not expose per-task choices or altered saved schedules: ' . json_encode($noAlternativePreview)
    );
    echo "PASS 37: no automatic plan exposes task-level choices without changing saved schedules\n";

    // 38. A user-approved extended task date limit is shown in preview and can
    // only be applied with that preview's confirmation token.
    [$user] = $newUser(['end_work_time' => '11:00:00', 'start_break_time' => null, 'end_break_time' => null]);
    $extendTarget = $createTask($user, 'Deadline extension target', 60, [
        $seg('2030-03-08', '09:00:00', '10:00:00', 60),
    ], '2030-03-08');
    $extendLater = $createTask($user, 'Deadline extension later task', 60, [
        $seg('2030-03-08', '10:00:00', '11:00:00', 60),
    ], '2030-03-08');
    $extendPayload = [
        'task_name' => $extendTarget->task_name, 'hour' => 2,
        'start_date' => '2030-03-08', 'end_date' => '2030-03-08', 'start_time' => '09:00',
        'auto_schedule' => true, 'schedule_changed' => true, 'reflow_mode' => 'mixed',
        'reflow_task_ids' => [$extendLater->id],
        'reflow_task_modes' => [['task_id' => $extendLater->id, 'mode' => 'forward']],
        'reflow_task_deadlines' => [['task_id' => $extendLater->id, 'end_date' => '2030-03-09']],
    ];
    $extendPreview = $responseData($controller->previewTaskSchedule(
        Request::create('/api/task/' . $extendTarget->id . '/schedule-preview', 'POST', $extendPayload),
        $extendTarget->id
    ));
    $assert(
        $extendPreview['success'] &&
        ($extendPreview['affected_tasks'][0]['date_limits']['end_date'] ?? null) === '2030-03-09' &&
        ($extendPreview['affected_tasks'][0]['segments'][0]['segment_date'] ?? null) === '2030-03-09',
        'Explicit deadline extension was not reflected in the preview: ' . json_encode($extendPreview)
    );
    $extendWithoutToken = $responseData($controller->update(
        Request::create('/api/task/' . $extendTarget->id . '/update', 'POST', $extendPayload),
        $extendTarget->id
    ));
    $assert(!$extendWithoutToken['success'] && $extendLater->fresh()->segments->first()->segment_date->format('Y-m-d') === '2030-03-08', 'An end-date extension saved without explicit preview confirmation.');
    $extendSavePayload = array_merge($extendPayload, ['schedule_preview_token' => $extendPreview['schedule_preview_token']]);
    $extendSave = $responseData($controller->update(
        Request::create('/api/task/' . $extendTarget->id . '/update', 'POST', $extendSavePayload),
        $extendTarget->id
    ));
    $assert(
        $extendSave['success'] &&
        $extendLater->fresh()->segments->first()->segment_date->format('Y-m-d') === '2030-03-09' &&
        $extendLater->fresh()->end_date === '2030-03-09' &&
        $extendLater->fresh()->segments->sum('allocated_minutes') === 60,
        'Confirmed end-date extension did not save the exact later schedule.'
    );
    echo "PASS 38: task end-date extension requires preview confirmation and saves the approved later placement\n";

    // 39. Preserve an existing 300-minute multi-day schedule, allocate only the
    // 60-minute increase, and move only the conflicting 240-minute task backward.
    \Carbon\Carbon::setTestNow('2026-11-24 08:00:00');
    [$user] = $newUser();
    $preserveTarget = $createTask($user, 'Preserve existing work', 300, [
        $seg('2026-11-23', '09:00:00', '13:00:00', 240),
        $seg('2026-11-24', '14:00:00', '15:00:00', 60),
    ], '2026-11-26');
    $fourHourLater = $createTask($user, 'Four-hour following task', 240, [
        $seg('2026-11-24', '15:00:00', '17:00:00', 120),
        $seg('2026-11-25', '09:00:00', '11:00:00', 120),
    ], '2026-11-26');
    $unrelatedNov25Morning = $createTask($user, 'Unrelated Nov 25 morning', 120, [$seg('2026-11-25', '11:00:00', '13:00:00', 120)], '2026-11-26');
    $unrelatedNov25Afternoon = $createTask($user, 'Unrelated Nov 25 afternoon', 180, [$seg('2026-11-25', '14:00:00', '17:00:00', 180)], '2026-11-26');
    $unrelatedNov26Morning = $createTask($user, 'Unrelated Nov 26 morning', 240, [$seg('2026-11-26', '09:00:00', '13:00:00', 240)], '2026-11-26');
    $unrelatedNov26Afternoon = $createTask($user, 'Unrelated Nov 26 afternoon', 180, [$seg('2026-11-26', '14:00:00', '17:00:00', 180)], '2026-11-26');
    $preserveTargetBefore = $segmentSnapshot($preserveTarget->id);
    $fourHourBefore = $segmentSnapshot($fourHourLater->id);
    $unrelatedBefore = collect([$unrelatedNov25Morning, $unrelatedNov25Afternoon, $unrelatedNov26Morning, $unrelatedNov26Afternoon])
        ->mapWithKeys(fn ($item) => [$item->id => $segmentSnapshot($item->id)])->all();
    $preservePayload = [
        'task_name' => $preserveTarget->task_name, 'hour' => 6,
        'start_date' => '2026-11-23', 'end_date' => '2026-11-26', 'start_time' => '09:00',
        'auto_schedule' => true, 'schedule_changed' => true, 'reflow_mode' => 'forward',
    ];
    $keepIncrementPreview = $responseData($controller->previewTaskSchedule(
        Request::create('/api/task/' . $preserveTarget->id . '/schedule-preview', 'POST', array_merge($preservePayload, ['reflow_mode' => 'keep'])),
        $preserveTarget->id
    ));
    $assert(
        !$keepIncrementPreview['success'] && !empty($keepIncrementPreview['conflicts']) &&
        $segmentSnapshot($preserveTarget->id) == $preserveTargetBefore &&
        $segmentSnapshot($fourHourLater->id) == $fourHourBefore,
        'Keeping later tasks did not report the incremental conflict or changed saved schedules: ' . json_encode($keepIncrementPreview)
    );
    $preservePreview = $responseData($controller->previewTaskSchedule(
        Request::create('/api/task/' . $preserveTarget->id . '/schedule-preview', 'POST', $preservePayload),
        $preserveTarget->id
    ));
    $assert(
        $preservePreview['success'] && !empty($preservePreview['automatic_fallback']) &&
        ($preservePreview['preferred_mode'] ?? null) === 'forward' &&
        ($preservePreview['duration_adjustment']['preserved_minutes'] ?? null) === 300 &&
        ($preservePreview['duration_adjustment']['added_minutes'] ?? null) === 60 &&
        ($preservePreview['suggested_task_ids'] ?? []) === [$fourHourLater->id] &&
        ($preservePreview['suggested_task_modes'][0]['mode'] ?? null) === 'backfill' &&
        $segmentSnapshot($preserveTarget->id) == $preserveTargetBefore &&
        $segmentSnapshot($fourHourLater->id) == $fourHourBefore,
        'The 300-to-360 preview did not preserve the saved schedule or recommend a bounded alternative: ' . json_encode($preservePreview)
    );
    $preserveSavePayload = array_merge($preservePayload, [
        'reflow_mode' => 'mixed',
        'reflow_task_ids' => $preservePreview['suggested_task_ids'],
        'reflow_task_modes' => $preservePreview['suggested_task_modes'],
        'schedule_preview_token' => $preservePreview['schedule_preview_token'],
    ]);
    $preserveSave = $responseData($controller->update(
        Request::create('/api/task/' . $preserveTarget->id . '/update', 'POST', $preserveSavePayload),
        $preserveTarget->id
    ));
    $preservedTargetSegments = $preserveTarget->fresh()->segments->sortBy(fn ($item) => $item->segment_date->format('Y-m-d') . '|' . $item->start_time)->values();
    $movedFourHourSegments = $fourHourLater->fresh()->segments->sortBy(fn ($item) => $item->segment_date->format('Y-m-d') . '|' . $item->start_time)->values();
    $latestFollowingDate = $movedFourHourSegments->max(fn ($segment) => $segment->segment_date->format('Y-m-d'));
    $assert(
        $preserveSave['success'] && $preservedTargetSegments->sum('allocated_minutes') === 360 &&
        $preservedTargetSegments->take(2)->map(fn ($item) => [$item->segment_date->format('Y-m-d'), $item->start_time, $item->end_time, (int) $item->allocated_minutes])->all() === [
            ['2026-11-23', '09:00:00', '13:00:00', 240], ['2026-11-24', '14:00:00', '15:00:00', 60],
        ] && $preservedTargetSegments->last()->segment_date->format('Y-m-d') === '2026-11-24' &&
        $preservedTargetSegments->last()->start_time === '15:00:00' && $preservedTargetSegments->last()->end_time === '16:00:00' &&
        $movedFourHourSegments->sum('allocated_minutes') === 240 && count($movedFourHourSegments) === 1 &&
        $movedFourHourSegments->first()->start_time === '09:00:00' && $movedFourHourSegments->first()->end_time === '13:00:00' &&
        $fourHourLater->fresh()->start_date === '2026-11-24' && $fourHourLater->fresh()->end_date === '2026-11-26' &&
        $latestFollowingDate <= '2026-11-26',
        'The confirmed edit lost/doubled time or did not place the following task before the updated schedule: ' . json_encode(['save' => $preserveSave, 'target' => $preservedTargetSegments->toArray(), 'following' => $movedFourHourSegments->toArray()])
    );
    foreach ([$unrelatedNov25Morning, $unrelatedNov25Afternoon, $unrelatedNov26Morning, $unrelatedNov26Afternoon] as $unrelated) {
        $assert($segmentSnapshot($unrelated->id) == $unrelatedBefore[$unrelated->id], 'Minimal reflow changed an unrelated task.');
    }
    $overlapCount = DB::table('task_segments as first')
        ->join('task as first_task', 'first_task.id', '=', 'first.task_id')
        ->join('task_segments as second', function ($join) {
            $join->on('second.segment_date', '=', 'first.segment_date')->whereColumn('second.id', '>', 'first.id');
        })
        ->join('task as second_task', 'second_task.id', '=', 'second.task_id')
        ->where('first_task.user_id', $user)->where('second_task.user_id', $user)
        ->whereNull('first_task.deleted_at')->whereNull('second_task.deleted_at')
        ->whereColumn('first.start_time', '<', 'second.end_time')->whereColumn('first.end_time', '>', 'second.start_time')
        ->count();
    $assert($overlapCount === 0 && $latestFollowingDate <= '2026-11-26', 'The saved alternative overlaps another task or exceeded the following task deadline.');
    echo "PASS 39: past multi-day work is preserved, only 60 minutes are added, and the 240-minute task moves backward within its Nov 26 deadline\n";
    \Carbon\Carbon::setTestNow();

    // 40. A decrease preserves completed work and releases only the latest future minutes.
    \Carbon\Carbon::setTestNow('2030-03-10 15:00:00');
    [$user] = $newUser();
    $decreaseTarget = $createTask($user, 'Trim latest minutes', 300, [
        $seg('2030-03-10', '09:00:00', '12:00:00', 180),
        $seg('2030-03-11', '09:00:00', '11:00:00', 120),
    ], '2030-03-11');
    $decreaseLater = $createTask($user, 'Keep later task fixed', 60, [$seg('2030-03-11', '11:00:00', '12:00:00', 60)], '2030-03-11');
    $decreaseLaterBefore = $segmentSnapshot($decreaseLater->id);
    $decreasePreview = $responseData($controller->previewTaskSchedule(
        Request::create('/api/task/' . $decreaseTarget->id . '/schedule-preview', 'POST', [
            'task_name' => $decreaseTarget->task_name, 'hour' => 4,
            'start_date' => '2030-03-10', 'end_date' => '2030-03-11', 'start_time' => '09:00',
            'auto_schedule' => true, 'schedule_changed' => true, 'reflow_mode' => 'keep',
        ]),
        $decreaseTarget->id
    ));
    $assert(
        $decreasePreview['success'] && ($decreasePreview['duration_adjustment']['preserved_minutes'] ?? null) === 240 &&
        ($decreasePreview['duration_adjustment']['released_minutes'] ?? null) === 60 &&
        array_sum(array_column($decreasePreview['segments'], 'allocated_minutes')) === 240 &&
        $decreasePreview['segments'][0]['segment_date'] === '2030-03-10' &&
        $decreasePreview['segments'][0]['start_time'] === '09:00:00' && $decreasePreview['segments'][1]['end_time'] === '10:00:00' &&
        $segmentSnapshot($decreaseLater->id) == $decreaseLaterBefore,
        'Duration decrease did not preserve elapsed work and trim only the latest scheduled time: ' . json_encode($decreasePreview)
    );
    \Carbon\Carbon::setTestNow();
    echo "PASS 40: duration decrease preserves elapsed work and releases only the latest 60 minutes\n";

    $db->rollBack();
    echo "PASS: lifecycle regression fixtures rolled back from the isolated test schema\n";
    if ($verificationFailures) exit(1);
} catch (Throwable $error) {
    if ($db->transactionLevel() > 0) $db->rollBack();
    fwrite(STDERR, 'FAIL: ' . $error->getMessage() . PHP_EOL);
    exit(1);
}
