<?php

// Runs two independent PHP processes against the isolated test schema.
require __DIR__ . '/../../vendor/autoload.php';
$app = require __DIR__ . '/../../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$testDatabase = getenv('TASKORBIT_TEST_DATABASE');
$configuredDatabase = config('database.connections.mysql.database');
if (!$testDatabase || strcasecmp($testDatabase, (string) $configuredDatabase) === 0) {
    throw new RuntimeException('Set TASKORBIT_TEST_DATABASE to the isolated MySQL test schema.');
}
config(['database.default' => 'mysql', 'database.connections.mysql.database' => $testDatabase]);
DB::purge('mysql');
$db = DB::connection('mysql');
$userId = random_int(100000, 1900000000);
$db->table('users')->insert(['id' => $userId]);
$now = now();
$db->table('slot_setting')->insert([
    'user_id' => $userId, 'working_days' => '1,2,3,4,5,6,7',
    'start_work_time' => '09:00:00', 'end_work_time' => '17:00:00',
    'start_break_time' => '13:00:00', 'end_break_time' => '14:00:00',
    'status' => 1, 'created_at' => $now, 'updated_at' => $now,
]);

$worker = __DIR__ . '/mysql_task_concurrency_worker.php';
$commandPrefix = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($worker) . ' ' . $userId;
$descriptors = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
$processes = [];
foreach (['Concurrent A', 'Concurrent B'] as $label) {
    $command = $commandPrefix . ' ' . escapeshellarg($label) . ' 2030-03-04';
    $pipes = [];
    $process = proc_open($command, $descriptors, $pipes, dirname(__DIR__, 2));
    if (!is_resource($process)) throw new RuntimeException('Could not start concurrent MySQL worker process.');
    fclose($pipes[0]);
    $processes[] = [$process, $pipes];
}

$results = [];
foreach ($processes as [$process, $pipes]) {
    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $exitCode = proc_close($process);
    if ($exitCode !== 0) throw new RuntimeException('Concurrent worker failed: ' . trim($stderr));
    $results[] = json_decode(trim($stdout), true, flags: JSON_THROW_ON_ERROR);
}

$successCount = count(array_filter($results, fn ($result) => $result['success']));
$activeTaskCount = $db->table('task')->where('user_id', $userId)->whereNull('deleted_at')->count();
$overlapCount = $db->table('task_segments as first')
    ->join('task as first_task', 'first_task.id', '=', 'first.task_id')
    ->join('task_segments as second', function ($join) {
        $join->on('second.segment_date', '=', 'first.segment_date')->whereColumn('second.id', '>', 'first.id');
    })
    ->join('task as second_task', 'second_task.id', '=', 'second.task_id')
    ->where('first_task.user_id', $userId)->where('second_task.user_id', $userId)
    ->whereNull('first_task.deleted_at')->whereNull('second_task.deleted_at')
    ->whereColumn('first.start_time', '<', 'second.end_time')->whereColumn('first.end_time', '>', 'second.start_time')
    ->count();

if ($successCount !== 1 || $activeTaskCount !== 1 || $overlapCount !== 0) {
    throw new RuntimeException('Concurrent scheduling did not serialize safely: ' . json_encode(['successes' => $successCount, 'active_tasks' => $activeTaskCount, 'overlaps' => $overlapCount]));
}
echo "PASS 15: concurrent requests serialized; one allocation succeeded, one was rejected, and no overlaps were stored.\n";
