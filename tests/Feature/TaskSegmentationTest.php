<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\TaskController;
use App\Models\SlotSetting;
use App\Models\Task;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class TaskSegmentationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
        DB::purge('sqlite');

        Schema::create('users', fn (Blueprint $table) => $table->id());
        DB::table('users')->insert(['id' => 7]);
        Schema::create('task', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id');
            $table->string('task_name');
            $table->float('hour')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->text('description')->nullable();
            $table->string('priority')->nullable();
            $table->boolean('status')->default(0);
            $table->softDeletes();
            $table->timestamps();
        });
        Schema::create('task_segments', function (Blueprint $table) {
            $table->id();
            $table->integer('task_id');
            $table->date('segment_date')->index();
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedSmallInteger('allocated_minutes');
            $table->unsignedSmallInteger('sequence')->default(1);
            $table->timestamps();
        });
        Schema::create('slot_setting', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id');
            $table->text('working_days')->nullable();
            $table->time('start_work_time')->nullable();
            $table->time('end_work_time')->nullable();
            $table->time('start_break_time')->nullable();
            $table->time('end_break_time')->nullable();
            $table->integer('status')->default(1);
            $table->timestamps();
        });
        Schema::create('holiday', function (Blueprint $table) {
            $table->id();
            $table->integer('setting_id');
            $table->string('holiday_name')->nullable();
            $table->date('holiday_date');
            $table->timestamps();
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('holiday');
        Schema::dropIfExists('slot_setting');
        Schema::dropIfExists('task_segments');
        Schema::dropIfExists('task');
        Schema::dropIfExists('users');
        parent::tearDown();
    }

    private function setting(string $days = '1,2,3,4,5,6,7', ?string $breakStart = '13:00:00', ?string $breakEnd = '14:00:00', string $start = '09:00:00', string $end = '17:00:00'): SlotSetting
    {
        return SlotSetting::create([
            'user_id' => 7,
            'working_days' => $days,
            'start_work_time' => $start,
            'end_work_time' => $end,
            'start_break_time' => $breakStart,
            'end_break_time' => $breakEnd,
            'status' => 1,
        ])->load('holidays');
    }

    private function request(array $overrides = []): Request
    {
        return Request::create('/api/task', 'POST', array_merge([
            'user_id' => 7,
            'task_name' => 'Segmented task',
            'hour' => 1,
            'start_date' => '2030-01-07',
            'end_date' => '2030-01-10',
        ], $overrides));
    }

    private function data($response): array
    {
        return $response->getData(true);
    }

    private function createTask(string $name, int $minutes, array $segments, array $taskOverrides = []): Task
    {
        $task = Task::create(array_merge([
            'user_id' => 7,
            'task_name' => $name,
            'hour' => (int) ceil($minutes / 60),
            'start_date' => '2030-01-07',
            'end_date' => '2030-01-07',
            'start_time' => $segments[0]['start_time'],
            'end_time' => end($segments)['end_time'],
            'status' => 0,
        ], $taskOverrides));
        foreach ($segments as $index => $segment) {
            $task->segments()->create(array_merge($segment, ['sequence' => $index + 1]));
        }
        return $task;
    }

    public function test_allocates_56_minutes_today_and_64_next_working_day_without_crossing_break(): void
    {
        $this->setting();
        $this->createTask('Existing', 364, [
            ['segment_date' => '2030-01-07', 'start_time' => '09:00:00', 'end_time' => '13:00:00', 'allocated_minutes' => 240],
            ['segment_date' => '2030-01-07', 'start_time' => '14:00:00', 'end_time' => '16:04:00', 'allocated_minutes' => 124],
        ]);

        $response = $this->data((new TaskController())->store($this->request(['hour' => 2])));
        $this->assertTrue($response['success']);
        $this->assertSame(120, $response['data']['total_allocated_minutes']);
        $this->assertSame([
            ['date' => '2030-01-07', 'start' => '16:04:00', 'end' => '17:00:00', 'minutes' => 56],
            ['date' => '2030-01-08', 'start' => '09:00:00', 'end' => '10:04:00', 'minutes' => 64],
        ], array_map(fn ($segment) => [
            'date' => substr($segment['segment_date'], 0, 10), 'start' => $segment['start_time'],
            'end' => $segment['end_time'], 'minutes' => $segment['allocated_minutes'],
        ], $response['data']['segments']));
    }

    public function test_splits_around_a_break_and_repeats_breaks_over_multiple_days(): void
    {
        $this->setting();
        $response = $this->data((new TaskController())->store($this->request(['hour' => 8])));
        $this->assertTrue($response['success']);
        $segments = $response['data']['segments'];
        $this->assertSame(['09:00:00-13:00:00', '14:00:00-17:00:00', '09:00:00-10:00:00'], array_map(
            fn ($s) => $s['start_time'] . '-' . $s['end_time'], $segments
        ));
        $this->assertSame(['2030-01-07', '2030-01-07', '2030-01-08'], array_map(fn ($s) => substr($s['segment_date'], 0, 10), $segments));
    }

    public function test_skips_weekends_and_holidays(): void
    {
        $setting = $this->setting('1,2,3,4,5');
        DB::table('holiday')->insert(['setting_id' => $setting->id, 'holiday_name' => 'Test holiday', 'holiday_date' => '2030-01-14']);
        $response = $this->data((new TaskController())->store($this->request([
            'hour' => 8, 'start_date' => '2030-01-11', 'end_date' => '2030-01-15',
        ])));
        $this->assertTrue($response['success']);
        $dates = collect($response['data']['segments'])->pluck('segment_date')->map(fn ($date) => substr($date, 0, 10))->unique()->values()->all();
        $this->assertSame(['2030-01-11', '2030-01-15'], $dates);
    }

    public function test_rejects_insufficient_capacity_without_partial_task_or_segments(): void
    {
        $this->setting();
        $response = $this->data((new TaskController())->store($this->request(['hour' => 8, 'end_date' => '2030-01-07'])));
        $this->assertFalse($response['success']);
        $this->assertSame(0, Task::count());
        $this->assertSame(0, DB::table('task_segments')->count());
    }

    public function test_manual_schedule_splits_around_break_and_rejects_existing_segment_overlap(): void
    {
        $this->setting();
        $response = $this->data((new TaskController())->store($this->request([
            'hour' => 2, 'start_time' => '11:30', 'end_time' => '15:30',
        ])));
        $this->assertTrue($response['success']);
        $this->assertSame(['11:30:00-13:00:00', '14:00:00-14:30:00'], array_map(
            fn ($s) => $s['start_time'] . '-' . $s['end_time'], $response['data']['segments']
        ));

        $overlap = $this->data((new TaskController())->store($this->request([
            'hour' => 1, 'start_time' => '11:00', 'end_time' => '12:00',
        ])));
        $this->assertFalse($overlap['success']);
        $this->assertSame(1, Task::count());
    }

    public function test_no_break_configuration_uses_continuous_working_window(): void
    {
        $this->setting('1,2,3,4,5,6,7', null, null);
        $response = $this->data((new TaskController())->store($this->request(['hour' => 8, 'end_date' => '2030-01-07'])));
        $this->assertTrue($response['success']);
        $this->assertSame('09:00:00', $response['data']['segments'][0]['start_time']);
        $this->assertSame('17:00:00', $response['data']['segments'][0]['end_time']);
    }

    public function test_editing_duration_replaces_segments_atomically(): void
    {
        $this->setting();
        $created = $this->data((new TaskController())->store($this->request(['hour' => 1])));
        $task = Task::findOrFail($created['data']['task']['id']);
        $updated = $this->data((new TaskController())->update($this->request([
            'task_name' => $task->task_name, 'hour' => 8, 'start_date' => '2030-01-07',
            'end_date' => '2030-01-08', 'auto_schedule' => true,
        ]), $task->id));
        $this->assertTrue($updated['success']);
        $this->assertSame(480, array_sum(array_column($updated['data']['segments'], 'allocated_minutes')));
        $this->assertSame(3, DB::table('task_segments')->where('task_id', $task->id)->count());
    }

    public function test_edit_preview_excludes_the_task_own_segments_and_rolls_back_preview_changes(): void
    {
        $this->setting('1,2,3,4,5,6,7', null, null);
        $task = $this->createTask('Editable', 300, [[
            'segment_date' => '2030-01-07', 'start_time' => '09:00:00', 'end_time' => '14:00:00', 'allocated_minutes' => 300,
        ]]);
        $preview = $this->data((new TaskController())->previewTaskSchedule($this->request([
            'hour' => 4, 'start_date' => '2030-01-07', 'end_date' => '2030-01-07', 'start_time' => '09:00', 'auto_schedule' => true, 'reflow_mode' => 'keep',
        ]), $task->id));

        $this->assertTrue($preview['success']);
        $this->assertSame(240, $preview['total_allocated_minutes']);
        $this->assertSame('09:00:00', $preview['segments'][0]['start_time']);
        $this->assertSame(300, (int) $task->fresh()->segments->sum('allocated_minutes'), 'Preview must not alter saved schedule segments.');
    }

    public function test_edit_can_preview_and_apply_forward_cascade_without_partial_changes(): void
    {
        $this->setting('1,2,3,4,5,6,7', null, null);
        $editable = $this->createTask('Editable', 240, [[
            'segment_date' => '2030-01-07', 'start_time' => '09:00:00', 'end_time' => '13:00:00', 'allocated_minutes' => 240,
        ]], ['end_date' => '2030-01-08']);
        $laterOne = $this->createTask('Later one', 60, [[
            'segment_date' => '2030-01-07', 'start_time' => '14:00:00', 'end_time' => '15:00:00', 'allocated_minutes' => 60,
        ]], ['end_date' => '2030-01-08']);
        $laterTwo = $this->createTask('Later two', 60, [[
            'segment_date' => '2030-01-07', 'start_time' => '15:00:00', 'end_time' => '16:00:00', 'allocated_minutes' => 60,
        ]], ['end_date' => '2030-01-08']);
        $edit = [
            'task_name' => 'Editable', 'hour' => 6, 'start_date' => '2030-01-07', 'end_date' => '2030-01-08',
            'start_time' => '09:00', 'auto_schedule' => true, 'reflow_mode' => 'forward',
        ];

        $preview = $this->data((new TaskController())->previewTaskSchedule($this->request($edit), $editable->id));
        $this->assertTrue($preview['success']);
        $this->assertCount(2, $preview['affected_tasks']);
        $this->assertSame('09:00:00', $preview['segments'][0]['start_time']);
        $this->assertSame('14:00:00', $laterOne->fresh()->segments->first()->start_time, 'Preview must leave later task positions untouched.');

        $saved = $this->data((new TaskController())->update($this->request($edit), $editable->id));
        $this->assertTrue($saved['success']);
        $this->assertSame(360, (int) $editable->fresh()->segments->sum('allocated_minutes'));
        $this->assertSame(60, (int) $laterOne->fresh()->segments->sum('allocated_minutes'));
        $this->assertSame(60, (int) $laterTwo->fresh()->segments->sum('allocated_minutes'));
        $this->assertGreaterThanOrEqual('15:00:00', $laterOne->fresh()->segments->first()->start_time);
    }

    public function test_edit_preserve_mode_reports_other_task_conflicts_without_moving_anything(): void
    {
        $this->setting('1,2,3,4,5,6,7', null, null);
        $editable = $this->createTask('Editable', 60, [[
            'segment_date' => '2030-01-07', 'start_time' => '09:00:00', 'end_time' => '10:00:00', 'allocated_minutes' => 60,
        ]], ['end_date' => '2030-01-07']);
        $blocker = $this->createTask('Busy', 420, [[
            'segment_date' => '2030-01-07', 'start_time' => '10:00:00', 'end_time' => '17:00:00', 'allocated_minutes' => 420,
        ]]);

        $preview = $this->data((new TaskController())->previewTaskSchedule($this->request([
            'hour' => 8, 'start_date' => '2030-01-07', 'end_date' => '2030-01-07', 'start_time' => '09:00', 'auto_schedule' => true, 'reflow_mode' => 'keep',
        ]), $editable->id));

        $this->assertFalse($preview['success']);
        $this->assertSame($blocker->id, $preview['conflicts'][0]['id']);
        $this->assertSame('10:00:00', $blocker->fresh()->segments->first()->start_time);
        $this->assertSame(60, (int) $editable->fresh()->segments->sum('allocated_minutes'));
    }

    public function test_incomplete_break_settings_fail_safely(): void
    {
        $this->setting('1,2,3,4,5,6,7', '13:00:00', null);
        $response = $this->data((new TaskController())->store($this->request()));
        $this->assertFalse($response['success']);
        $this->assertStringContainsString('Both break start and break end', $response['message']);
        $this->assertSame(0, Task::count());
    }

    public function test_delete_reflows_later_segments_to_earliest_available_period(): void
    {
        $this->setting();
        $first = $this->createTask('First', 60, [[
            'segment_date' => '2030-01-07', 'start_time' => '09:00:00', 'end_time' => '10:00:00', 'allocated_minutes' => 60,
        ]]);
        $later = $this->createTask('Later', 60, [[
            'segment_date' => '2030-01-07', 'start_time' => '10:00:00', 'end_time' => '11:00:00', 'allocated_minutes' => 60,
        ]]);
        $response = $this->data((new TaskController())->destroy(Request::create('/api/task', 'GET', ['reflow' => 'true']), $first->id));
        $this->assertTrue($response['success']);
        $this->assertNotNull(Task::onlyTrashed()->find($first->id));
        $this->assertSame('09:00:00', $later->fresh()->segments->first()->start_time);
    }

    public function test_failed_reflow_rolls_back_deleted_task_and_partial_rescheduling(): void
    {
        $this->setting();
        $first = $this->createTask('First', 60, [[
            'segment_date' => '2030-01-07', 'start_time' => '09:00:00', 'end_time' => '10:00:00', 'allocated_minutes' => 60,
        ]]);
        $this->createTask('Fits first', 60, [[
            'segment_date' => '2030-01-07', 'start_time' => '10:00:00', 'end_time' => '11:00:00', 'allocated_minutes' => 60,
        ]]);
        $impossible = $this->createTask('Impossible legacy duration', 500, [[
            'segment_date' => '2030-01-07', 'start_time' => '11:00:00', 'end_time' => '11:30:00', 'allocated_minutes' => 500,
        ]]);
        $response = $this->data((new TaskController())->destroy(Request::create('/api/task', 'GET', ['reflow' => 'true']), $first->id));
        $this->assertFalse($response['success']);
        $this->assertFalse($first->fresh()->trashed());
        $this->assertSame(1, DB::table('task_segments')->where('task_id', $first->id)->count());
        $this->assertSame('10:00:00', $impossible->fresh()->segments->first()->start_time);
        $this->assertSame(3, Task::count());
    }
}
