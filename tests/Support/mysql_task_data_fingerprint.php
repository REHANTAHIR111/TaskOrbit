<?php

// Prints only row count and a hash so task data is not disclosed while
// checking that a schema migration left every legacy task row unchanged.
require __DIR__ . '/../../vendor/autoload.php';
$app = require __DIR__ . '/../../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

if (($argv[1] ?? null) === '--targets') {
    $targets = DB::select("SELECT SCHEMA_NAME AS database_name FROM INFORMATION_SCHEMA.SCHEMATA WHERE LOWER(SCHEMA_NAME) LIKE '%taskorbit%' ORDER BY SCHEMA_NAME");
    echo json_encode(['current_database' => DB::connection()->getDatabaseName(), 'taskorbit_databases' => $targets]) . PHP_EOL;
    exit(0);
}
if (($argv[1] ?? null) === '--ids') {
    $rows = DB::table('task')->orderBy('id')->get(['id', 'user_id', 'created_at', 'deleted_at']);
    $records = $rows->map(fn ($task) => [
        'id' => $task->id,
        'user_id' => $task->user_id,
        'created_at' => $task->created_at,
        'deleted_at' => $task->deleted_at,
        'segment_count' => DB::table('task_segments')->where('task_id', $task->id)->count(),
    ]);
    echo json_encode(['database' => DB::connection()->getDatabaseName(), 'tasks' => $records]) . PHP_EOL;
    exit(0);
}

$rows = DB::table('task')->orderBy('id')->get([
    'id', 'user_id', 'task_name', 'hour', 'start_date', 'end_date', 'start_time', 'end_time',
    'description', 'priority', 'status', 'deleted_at', 'created_at', 'updated_at',
]);
$segmentSummary = null;
$hourColumn = DB::selectOne("SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'task' AND COLUMN_NAME = 'hour'");
if (Illuminate\Support\Facades\Schema::hasTable('task_segments')) {
    $segmentSummary = [
        'segment_count' => DB::table('task_segments')->count(),
        'tasks_without_segments' => DB::table('task')->whereNotExists(function ($query) {
            $query->selectRaw('1')->from('task_segments')->whereColumn('task_segments.task_id', 'task.id');
        })->count(),
        'duration_mismatches' => DB::table('task')->whereRaw(
            '(SELECT COALESCE(SUM(task_segments.allocated_minutes), 0) FROM task_segments WHERE task_segments.task_id = task.id) <> ROUND(task.hour * 60)'
        )->count(),
        'orphan_segments' => DB::table('task_segments')->leftJoin('task', 'task.id', '=', 'task_segments.task_id')->whereNull('task.id')->count(),
        'foreign_key_count' => count(DB::select("SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'task_segments' AND REFERENCED_TABLE_NAME = 'task'")),
    ];
}
echo json_encode([
    'driver' => DB::connection()->getDriverName(),
    'database' => DB::connection()->getDatabaseName(),
    'task_count' => $rows->count(),
    'task_fingerprint' => hash('sha256', json_encode($rows->toArray())),
    'hour_column' => $hourColumn ? ['type' => $hourColumn->COLUMN_TYPE, 'nullable' => $hourColumn->IS_NULLABLE, 'default' => $hourColumn->COLUMN_DEFAULT] : null,
    'segments' => $segmentSummary,
]) . PHP_EOL;
