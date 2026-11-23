<?php

require __DIR__ . '/../../vendor/autoload.php';
$app = require __DIR__ . '/../../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Http\Controllers\Api\TaskController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

$testDatabase = getenv('TASKORBIT_TEST_DATABASE');
$configuredDatabase = config('database.connections.mysql.database');
if (!$testDatabase || strcasecmp($testDatabase, (string) $configuredDatabase) === 0) {
    fwrite(STDERR, "Isolated MySQL test database is required.\n");
    exit(2);
}
config(['database.default' => 'mysql', 'database.connections.mysql.database' => $testDatabase]);
DB::purge('mysql');

$userId = (int) ($argv[1] ?? 0);
$label = (string) ($argv[2] ?? 'Concurrent task');
$date = (string) ($argv[3] ?? '2030-03-04');
$response = (new TaskController())->store(Request::create('/api/task', 'POST', [
    'user_id' => $userId, 'task_name' => $label, 'hour' => 4,
    'start_date' => $date, 'end_date' => $date,
]))->getData(true);
echo json_encode(['success' => (bool) ($response['success'] ?? false), 'message' => $response['message'] ?? null]) . PHP_EOL;
