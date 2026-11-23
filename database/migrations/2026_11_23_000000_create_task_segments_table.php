<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('task_segments')) {
            Schema::create('task_segments', function (Blueprint $table) {
                $table->bigIncrements('id');
                $this->addTaskForeignKeyColumn($table);
                $table->date('segment_date')->index('task_segments_date_idx');
                $table->time('start_time');
                $table->time('end_time');
                $table->unsignedSmallInteger('allocated_minutes');
                $table->unsignedSmallInteger('sequence')->default(1);
                $table->timestamps();
                $table->foreign('task_id', 'task_segments_task_fk')->references('id')->on('task')->cascadeOnDelete();
                $table->index(['task_id', 'segment_date', 'sequence'], 'task_segments_task_date_idx');
                $table->index(['segment_date', 'start_time', 'end_time'], 'task_segments_date_time_idx');
            });
        }

        $this->backfillLegacyTasks();
    }

    public function down(): void
    {
        // Roll back only the new schedule data. Legacy task rows and their
        // existing date/time/duration columns are never altered or removed.
        Schema::dropIfExists('task_segments');
    }

    private function addTaskForeignKeyColumn(Blueprint $table): void
    {
        if (DB::connection()->getDriverName() === 'mysql') {
            $idType = DB::selectOne(
                'SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
                ['task', 'id']
            )->COLUMN_TYPE ?? 'bigint unsigned';
            $isUnsigned = str_contains(strtolower($idType), 'unsigned');
            if (str_contains(strtolower($idType), 'bigint')) {
                $table->{$isUnsigned ? 'unsignedBigInteger' : 'bigInteger'}('task_id');
            } else {
                $table->{$isUnsigned ? 'unsignedInteger' : 'integer'}('task_id');
            }
            return;
        }

        $table->foreignId('task_id');
    }

    private function backfillLegacyTasks(): void
    {
        $settings = DB::table('slot_setting')->get()->keyBy('user_id');
        $holidays = DB::table('holiday')->get()->groupBy('setting_id');
        $now = now();

        DB::table('task')->orderBy('id')->chunk(200, function ($tasks) use ($settings, $holidays, $now) {
            foreach ($tasks as $task) {
                if (DB::table('task_segments')->where('task_id', $task->id)->exists()) {
                    continue;
                }
                if (!$task->start_date || !$task->start_time || !$task->end_date || !$task->end_time) {
                    continue;
                }

                $start = Carbon::parse($task->start_date . ' ' . $task->start_time);
                $end = Carbon::parse($task->end_date . ' ' . $task->end_time);
                $minutes = (int) round(((float) $task->hour) * 60);
                if ($minutes <= 0 && $end->gt($start)) {
                    $minutes = (int) $start->diffInMinutes($end);
                }
                if ($minutes <= 0) {
                    continue;
                }

                $setting = $settings->get($task->user_id);
                $holidayDates = $setting ? ($holidays->get($setting->id, collect())->pluck('holiday_date')->all()) : [];
                $segments = $setting ? $this->backfillWithinWorkingSettings($task, $setting, $holidayDates, $minutes) : [];

                // Some old rows have time windows inconsistent with their
                // stored duration. Retain both by backfilling their duration
                // from the old start timestamp in calendar-day chunks.
                if (!$segments || array_sum(array_column($segments, 'allocated_minutes')) !== $minutes) {
                    $segments = $this->backfillLegacyCalendarWindow($task, $start, $minutes);
                }

                foreach ($segments as $index => &$segment) {
                    $segment['task_id'] = $task->id;
                    $segment['sequence'] = $index + 1;
                    $segment['created_at'] = $now;
                    $segment['updated_at'] = $now;
                }
                unset($segment);
                DB::table('task_segments')->insert($segments);
            }
        });
    }

    private function backfillWithinWorkingSettings($task, $setting, array $holidayDates, int $requiredMinutes): array
    {
        if (empty($setting->working_days) || empty($setting->start_work_time) || empty($setting->end_work_time)) {
            return [];
        }

        $days = collect(explode(',', (string) $setting->working_days))->map(fn ($day) => (int) trim($day))->all();
        $workStart = Carbon::parse($setting->start_work_time);
        $workEnd = Carbon::parse($setting->end_work_time);
        if (!$workStart->lt($workEnd)) {
            return [];
        }

        $hasBreakStart = !empty($setting->start_break_time);
        $hasBreakEnd = !empty($setting->end_break_time);
        if ($hasBreakStart !== $hasBreakEnd) {
            return [];
        }
        try {
            $breakStart = $hasBreakStart ? Carbon::parse($setting->start_break_time) : null;
            $breakEnd = $hasBreakEnd ? Carbon::parse($setting->end_break_time) : null;
        } catch (\Throwable $e) {
            return [];
        }
        if ($breakStart && (!$breakStart->lt($breakEnd) ||
            $breakStart->format('H:i:s') < $workStart->format('H:i:s') ||
            $breakEnd->format('H:i:s') > $workEnd->format('H:i:s'))) {
            return [];
        }
        $segments = [];
        $remaining = $requiredMinutes;
        $firstDate = Carbon::parse($task->start_date)->startOfDay();
        $lastDate = Carbon::parse($task->end_date)->startOfDay();

        for ($date = $firstDate->copy(); $date->lte($lastDate) && $remaining > 0; $date->addDay()) {
            if (!in_array($date->dayOfWeekIso, $days, true) || in_array($date->format('Y-m-d'), $holidayDates, true)) {
                continue;
            }

            $start = $date->copy()->setTime($workStart->hour, $workStart->minute, $workStart->second);
            $end = $date->copy()->setTime($workEnd->hour, $workEnd->minute, $workEnd->second);
            if ($date->isSameDay($firstDate)) {
                $legacyStart = $date->copy()->setTimeFromTimeString($task->start_time);
                $start = $start->max($legacyStart);
            }
            if ($date->isSameDay($lastDate)) {
                $legacyEnd = $date->copy()->setTimeFromTimeString($task->end_time);
                $end = $end->min($legacyEnd);
            }
            if (!$start->lt($end)) {
                continue;
            }

            $windows = [['start' => $start, 'end' => $end]];
            if ($breakStart && $breakEnd && $breakStart->lt($breakEnd)) {
                $breakFrom = $date->copy()->setTime($breakStart->hour, $breakStart->minute, $breakStart->second);
                $breakTo = $date->copy()->setTime($breakEnd->hour, $breakEnd->minute, $breakEnd->second);
                $windows = $this->subtractBreak($windows, $breakFrom, $breakTo);
            }

            foreach ($windows as $window) {
                if ($remaining <= 0) {
                    break 2;
                }
                $available = (int) $window['start']->diffInMinutes($window['end']);
                $allocated = min($remaining, $available);
                if ($allocated <= 0) {
                    continue;
                }
                $segmentEnd = $window['start']->copy()->addMinutes($allocated);
                $segments[] = [
                    'segment_date' => $date->format('Y-m-d'),
                    'start_time' => $window['start']->format('H:i:s'),
                    'end_time' => $segmentEnd->format('H:i:s'),
                    'allocated_minutes' => $allocated,
                ];
                $remaining -= $allocated;
            }
        }

        return $remaining === 0 ? $segments : [];
    }

    private function subtractBreak(array $windows, Carbon $breakStart, Carbon $breakEnd): array
    {
        $result = [];
        foreach ($windows as $window) {
            if (!$breakStart->lt($window['end']) || !$breakEnd->gt($window['start'])) {
                $result[] = $window;
                continue;
            }
            if ($window['start']->lt($breakStart)) {
                $result[] = ['start' => $window['start']->copy(), 'end' => $breakStart->copy()];
            }
            if ($breakEnd->lt($window['end'])) {
                $result[] = ['start' => $breakEnd->copy(), 'end' => $window['end']->copy()];
            }
        }
        return $result;
    }

    private function backfillLegacyCalendarWindow($task, Carbon $start, int $requiredMinutes): array
    {
        $segments = [];
        $remaining = $requiredMinutes;
        $cursor = $start->copy();

        while ($remaining > 0) {
            $midnight = $cursor->copy()->addDay()->startOfDay();
            $available = (int) $cursor->diffInMinutes($midnight);
            $allocated = min($remaining, max(1, $available));
            $segmentEnd = $cursor->copy()->addMinutes($allocated);
            $segments[] = [
                'segment_date' => $cursor->format('Y-m-d'),
                'start_time' => $cursor->format('H:i:s'),
                'end_time' => $segmentEnd->format('H:i:s'),
                'allocated_minutes' => $allocated,
            ];
            $remaining -= $allocated;
            $cursor = $segmentEnd;
        }

        return $segments;
    }
};
