<?php

// Run with: php tests/Support/mysql_task_segmentation_smoke.php
// The suite shadows application tables with connection-local TEMPORARY tables.
// It exercises the real configured MySQL server without writing persistent data.

require __DIR__ . '/../../vendor/autoload.php';

$app = require __DIR__ . '/../../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Http\Controllers\Api\TaskController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

$testDatabase = getenv('TASKORBIT_TEST_DATABASE');
$configuredDatabase = config('database.connections.mysql.database');
if (!$testDatabase || strcasecmp($testDatabase, (string) $configuredDatabase) === 0) {
    throw new RuntimeException('Set TASKORBIT_TEST_DATABASE to a dedicated MySQL test schema different from the configured application database.');
}
config(['database.default' => 'mysql', 'database.connections.mysql.database' => $testDatabase]);
DB::purge('mysql');
$db = DB::connection('mysql');
if ($db->getDriverName() !== 'mysql') {
    throw new RuntimeException('This smoke suite requires the configured MySQL driver.');
}

foreach (['holiday', 'slot_setting', 'task_segments', 'task', 'users'] as $table) {
    $db->statement("DROP TEMPORARY TABLE IF EXISTS `{$table}`");
}
$db->statement('CREATE TEMPORARY TABLE users (id INT PRIMARY KEY) ENGINE=InnoDB');
$db->statement('CREATE TEMPORARY TABLE task (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, task_name VARCHAR(255), hour FLOAT NULL, start_date DATE, end_date DATE, start_time TIME, end_time TIME, description TEXT, priority VARCHAR(255), status TINYINT DEFAULT 0, deleted_at TIMESTAMP NULL, created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL) ENGINE=InnoDB');
$db->statement('CREATE TEMPORARY TABLE task_segments (id BIGINT AUTO_INCREMENT PRIMARY KEY, task_id INT NOT NULL, segment_date DATE NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL, allocated_minutes SMALLINT UNSIGNED NOT NULL, sequence SMALLINT UNSIGNED NOT NULL DEFAULT 1, created_at TIMESTAMP NULL, updated_at TIMESTAMP NULL, INDEX(task_id, segment_date, sequence), INDEX(segment_date, start_time, end_time)) ENGINE=InnoDB');
$db->statement('CREATE TEMPORARY TABLE slot_setting (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, working_days TEXT, start_work_time TIME, end_work_time TIME, start_break_time TIME NULL, end_break_time TIME NULL, status INT DEFAULT 1) ENGINE=InnoDB');
$db->statement('CREATE TEMPORARY TABLE holiday (id INT AUTO_INCREMENT PRIMARY KEY, setting_id INT, holiday_name VARCHAR(255), holiday_date DATE) ENGINE=InnoDB');
$db->table('users')->insert(['id' => 7]);
$settingId = $db->table('slot_setting')->insertGetId([
    'user_id' => 7, 'working_days' => '1,2,3,4,5,6,7', 'start_work_time' => '09:00:00',
    'end_work_time' => '17:00:00', 'start_break_time' => '13:00:00', 'end_break_time' => '14:00:00', 'status' => 1,
]);

$assert = static function (bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
};
$base = ['user_id' => 7, 'task_name' => 'Regression', 'hour' => 2, 'start_date' => '2030-01-07', 'end_date' => '2030-01-08'];
$controller = new TaskController();

// A blocking task leaves exactly 56 minutes on day one. The new task must
// resume with 64 minutes on the next working day, never crossing the break.
$blockerId = $db->table('task')->insertGetId([
    'user_id' => 7, 'task_name' => 'Blocker', 'hour' => 6, 'start_date' => '2030-01-07', 'end_date' => '2030-01-07',
    'start_time' => '09:00:00', 'end_time' => '16:04:00', 'status' => 0,
]);
foreach ([['09:00:00', '13:00:00', 240], ['14:00:00', '16:04:00', 124]] as $i => [$start, $end, $minutes]) {
    $db->table('task_segments')->insert(['task_id' => $blockerId, 'segment_date' => '2030-01-07', 'start_time' => $start, 'end_time' => $end, 'allocated_minutes' => $minutes, 'sequence' => $i + 1]);
}
$response = $controller->store(Request::create('/api/task', 'POST', $base))->getData(true);
$assert($response['success'] === true, '56 + 64 minute allocation failed: ' . ($response['message'] ?? ''));
$actual = array_map(static fn ($s) => [substr((string) $s['segment_date'], 0, 10), $s['start_time'], $s['end_time'], (int) $s['allocated_minutes']], $response['data']['segments']);
$assert($actual === [['2030-01-07', '16:04:00', '17:00:00', 56], ['2030-01-08', '09:00:00', '10:04:00', 64]], 'Unexpected 56 + 64 minute segments.');

// A manually requested interval may cross the break only as two distinct work segments.
$manual = $controller->store(Request::create('/api/task', 'POST', array_merge($base, [
    'hour' => 2, 'start_date' => '2030-01-09', 'end_date' => '2030-01-09', 'start_time' => '11:30', 'end_time' => '15:30',
])))->getData(true);
$assert($manual['success'] === true, 'Manual split over break failed.');
$manualParts = array_map(static fn ($s) => $s['start_time'] . '-' . $s['end_time'], $manual['data']['segments']);
$assert($manualParts === ['11:30:00-13:00:00', '14:00:00-14:30:00'], 'Manual segments crossed the break or had wrong duration.');

// Manual overlap must reject instead of saving any part.
$before = $db->table('task')->count();
$overlap = $controller->store(Request::create('/api/task', 'POST', array_merge($base, [
    'hour' => 1, 'start_date' => '2030-01-09', 'end_date' => '2030-01-09', 'start_time' => '12:00', 'end_time' => '13:00',
])))->getData(true);
$assert($overlap['success'] === false && $db->table('task')->count() === $before, 'Manual overlap was not rejected cleanly.');

// Editing the task duration replaces its segment set with an exact total.
$edited = $controller->update(Request::create('/api/task', 'POST', array_merge($base, [
    'hour' => 8, 'start_date' => '2030-01-09', 'end_date' => '2030-01-10', 'auto_schedule' => true,
])), $manual['data']['task']['id'])->getData(true);
$assert($edited['success'] === true, 'Task duration edit failed.');
$assert(array_sum(array_map(static fn ($s) => (int) $s['allocated_minutes'], $edited['data']['segments'])) === 480, 'Edited segments do not match the requested duration.');

// No complete duration in range must create neither task nor partial segments.
$before = $db->table('task')->count();
$insufficient = $controller->store(Request::create('/api/task', 'POST', array_merge($base, [
    'hour' => 8, 'start_date' => '2030-01-10', 'end_date' => '2030-01-10',
])))->getData(true);
$assert($insufficient['success'] === false && $db->table('task')->count() === $before, 'Insufficient allocation left a partial task.');

// Weekdays and holidays are skipped in the same multi-day allocation path.
$db->table('slot_setting')->where('id', $settingId)->update(['working_days' => '1,2,3,4,5']);
$db->table('holiday')->insert(['setting_id' => $settingId, 'holiday_name' => 'Holiday', 'holiday_date' => '2030-01-14']);
$skip = $controller->store(Request::create('/api/task', 'POST', array_merge($base, [
    'hour' => 8, 'start_date' => '2030-01-11', 'end_date' => '2030-01-15',
])))->getData(true);
$assert($skip['success'] === true, 'Weekend/holiday allocation failed.');
$skipDates = array_values(array_unique(array_map(static fn ($s) => substr((string) $s['segment_date'], 0, 10), $skip['data']['segments'])));
$assert($skipDates === ['2030-01-11', '2030-01-15'], 'Allocation did not skip weekend and holiday.');

// Deletion reflow moves later segments to the earliest free working time.
$reflowTarget = $db->table('task')->insertGetId([
    'user_id' => 7, 'task_name' => 'Reflow target', 'hour' => 1, 'start_date' => '2030-01-16', 'end_date' => '2030-01-16',
    'start_time' => '09:00:00', 'end_time' => '10:00:00', 'status' => 0,
]);
$laterId = $db->table('task')->insertGetId([
    'user_id' => 7, 'task_name' => 'Reflow later', 'hour' => 1, 'start_date' => '2030-01-16', 'end_date' => '2030-01-16',
    'start_time' => '10:00:00', 'end_time' => '11:00:00', 'status' => 0,
]);
foreach ([[$reflowTarget, '09:00:00', '10:00:00'], [$laterId, '10:00:00', '11:00:00']] as [$id, $start, $end]) {
    $db->table('task_segments')->insert(['task_id' => $id, 'segment_date' => '2030-01-16', 'start_time' => $start, 'end_time' => $end, 'allocated_minutes' => 60, 'sequence' => 1]);
}
$deleted = $controller->destroy(Request::create('/api/task', 'GET', ['reflow' => 'true']), $reflowTarget)->getData(true);
$assert($deleted['success'] === true, 'Delete/reflow failed.');
$assert($db->table('task_segments')->where('task_id', $laterId)->value('start_time') === '09:00:00', 'Later task was not moved into the released segment.');

// Force a failure after an earlier task has been reallocated; transaction
// rollback must restore deleted task rows and every old segment.
$rollbackTarget = $db->table('task')->insertGetId([
    'user_id' => 7, 'task_name' => 'Rollback target', 'hour' => 1, 'start_date' => '2030-01-17', 'end_date' => '2030-01-17',
    'start_time' => '09:00:00', 'end_time' => '10:00:00', 'status' => 0,
]);
$fitsId = $db->table('task')->insertGetId([
    'user_id' => 7, 'task_name' => 'Fits first', 'hour' => 1, 'start_date' => '2030-01-17', 'end_date' => '2030-01-17',
    'start_time' => '10:00:00', 'end_time' => '11:00:00', 'status' => 0,
]);
$tooLongId = $db->table('task')->insertGetId([
    'user_id' => 7, 'task_name' => 'Legacy oversized allocation', 'hour' => 8, 'start_date' => '2030-01-17', 'end_date' => '2030-01-17',
    'start_time' => '11:00:00', 'end_time' => '11:30:00', 'status' => 0,
]);
foreach ([[$rollbackTarget, '09:00:00', '10:00:00', 60], [$fitsId, '10:00:00', '11:00:00', 60], [$tooLongId, '11:00:00', '11:30:00', 500]] as [$id, $start, $end, $minutes]) {
    $db->table('task_segments')->insert(['task_id' => $id, 'segment_date' => '2030-01-17', 'start_time' => $start, 'end_time' => $end, 'allocated_minutes' => $minutes, 'sequence' => 1]);
}
$rollback = $controller->destroy(Request::create('/api/task', 'GET', ['reflow' => 'true']), $rollbackTarget)->getData(true);
$assert($rollback['success'] === false, 'Impossible reflow unexpectedly succeeded.');
$assert($db->table('task')->where('id', $rollbackTarget)->whereNull('deleted_at')->exists(), 'Failed reflow did not roll back the soft delete.');
$assert($db->table('task_segments')->where('task_id', $fitsId)->value('start_time') === '10:00:00', 'Failed reflow did not restore earlier allocations.');

// Break settings must be complete, while no-break settings stay supported.
$db->table('slot_setting')->where('id', $settingId)->update(['start_break_time' => '13:00:00', 'end_break_time' => null]);
$invalidBreak = $controller->store(Request::create('/api/task', 'POST', array_merge($base, [
    'hour' => 1, 'start_date' => '2030-01-20', 'end_date' => '2030-01-20',
])))->getData(true);
$assert($invalidBreak['success'] === false, 'Incomplete break configuration was accepted.');
$db->table('slot_setting')->where('id', $settingId)->update(['start_break_time' => null, 'end_break_time' => null]);
$halfHour = $controller->store(Request::create('/api/task', 'POST', array_merge($base, [
    'hour' => 0.5, 'start_date' => '2030-01-21', 'end_date' => '2030-01-21',
])))->getData(true);
$assert($halfHour['success'] === true, 'Fractional-hour task failed.');
$assert(array_sum(array_map(static fn ($s) => (int) $s['allocated_minutes'], $halfHour['data']['segments'])) === 30, 'Fractional duration did not map to the expected minutes.');
$assert((float) $db->table('task')->where('id', $halfHour['data']['task']['id'])->value('hour') === 0.5, 'Legacy hour column lost fractional duration precision.');
$noBreak = $controller->store(Request::create('/api/task', 'POST', array_merge($base, [
    'hour' => 8, 'start_date' => '2030-01-22', 'end_date' => '2030-01-22',
])))->getData(true);
$assert($noBreak['success'] === true, 'No-break configuration failed.');
$assert(count($noBreak['data']['segments']) === 1 && $noBreak['data']['segments'][0]['end_time'] === '17:00:00', 'No-break task did not use the full working window.');

fwrite(STDOUT, "PASS: MySQL temporary-table segmentation smoke checks (56+64, break segments, manual, overlap, capacity, holiday/weekend, edit, reflow, rollback, invalid/no-break settings).\n");
