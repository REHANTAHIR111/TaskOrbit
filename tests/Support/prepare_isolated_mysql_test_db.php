<?php

// Creates a separate test schema and application-shaped tables only.
// Run this before the targeted task_segments migration against that schema.
require __DIR__ . '/../../vendor/autoload.php';
$app = require __DIR__ . '/../../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$databaseName = getenv('TASKORBIT_TEST_DATABASE') ?: 'taskorbit_regression_test';
$liveDatabase = config('database.connections.mysql.database');
if (!preg_match('/^[A-Za-z0-9_]+$/', $databaseName) || strcasecmp($databaseName, (string) $liveDatabase) === 0) {
    throw new RuntimeException('Choose a valid test database name different from the configured application database.');
}
if (DB::connection()->getDriverName() !== 'mysql') {
    throw new RuntimeException('The isolated regression database requires MySQL.');
}
DB::statement("CREATE DATABASE IF NOT EXISTS `{$databaseName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
config(['database.default' => 'mysql', 'database.connections.mysql.database' => $databaseName]);
DB::purge('mysql');

if (!Schema::hasTable('users')) {
    Schema::create('users', fn (Blueprint $table) => $table->id());
}
if (!Schema::hasTable('task')) {
    Schema::create('task', function (Blueprint $table) {
        $table->id();
        $table->integer('user_id')->nullable()->index();
        $table->string('task_name')->nullable()->index();
        $table->float('hour')->nullable()->index();
        $table->date('start_date')->nullable()->index();
        $table->date('end_date')->nullable()->index();
        $table->time('start_time')->nullable()->index();
        $table->time('end_time')->nullable()->index();
        $table->text('description')->nullable();
        $table->string('priority')->nullable()->index();
        $table->boolean('status')->default(0)->index();
        $table->softDeletes();
        $table->timestamps();
    });
}
if (!Schema::hasTable('slot_setting')) {
    Schema::create('slot_setting', function (Blueprint $table) {
        $table->id();
        $table->integer('user_id')->nullable()->index();
        $table->text('working_days')->nullable();
        $table->time('start_work_time')->nullable();
        $table->time('end_work_time')->nullable();
        $table->time('start_break_time')->nullable();
        $table->time('end_break_time')->nullable();
        $table->integer('status')->nullable()->index();
        $table->timestamps();
    });
}
if (!Schema::hasTable('holiday')) {
    Schema::create('holiday', function (Blueprint $table) {
        $table->id();
        $table->integer('setting_id')->nullable()->index();
        $table->string('holiday_name')->nullable();
        $table->date('holiday_date')->nullable()->index();
        $table->timestamps();
    });
}

$seededLegacy = false;
if (!Schema::hasTable('task_segments') && !DB::table('task')->where('user_id', 91001)->exists()) {
    $now = now();
    DB::table('users')->insert(['id' => 91001]);
    $settingId = DB::table('slot_setting')->insertGetId([
        'user_id' => 91001, 'working_days' => '1,2,3,4,5,6,7', 'start_work_time' => '09:00:00',
        'end_work_time' => '17:00:00', 'start_break_time' => '13:00:00', 'end_break_time' => '14:00:00',
        'status' => 1, 'created_at' => $now, 'updated_at' => $now,
    ]);
    DB::table('task')->insert([
        'user_id' => 91001, 'task_name' => 'Migration backfill fixture', 'hour' => 2,
        'start_date' => '2030-01-07', 'end_date' => '2030-01-07', 'start_time' => '09:00:00',
        'end_time' => '11:00:00', 'status' => 0, 'created_at' => $now, 'updated_at' => $now,
    ]);
    $seededLegacy = true;
}

echo json_encode([
    'isolated_database' => $databaseName,
    'task_segments_exists' => Schema::hasTable('task_segments'),
    'legacy_backfill_fixture_seeded' => $seededLegacy,
]) . PHP_EOL;
