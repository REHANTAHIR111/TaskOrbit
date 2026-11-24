<?php

namespace App\Services;

use App\Models\TaskSegment;
use Carbon\Carbon;

class TaskSchedulingService
{
    public function allocate(int $userId, Carbon $startDate, Carbon $endDate, int $requiredMinutes, $setting, ?int $excludeTaskId = null, ?Carbon $startAt = null): ?array
    {
        if ($requiredMinutes <= 0 || $endDate->copy()->startOfDay()->lt($startDate->copy()->startOfDay())) {
            return null;
        }

        $segments = [];
        $remaining = $requiredMinutes;

        for ($date = $startDate->copy()->startOfDay(); $date->lte($endDate->copy()->startOfDay()) && $remaining > 0; $date->addDay()) {
            foreach ($this->workingWindows($date, $setting, $startAt, null) as $window) {
                foreach ($this->freeWindows($userId, $date, $window, $excludeTaskId) as $free) {
                    $available = (int) $free['start']->diffInMinutes($free['end']);
                    if ($available <= 0) {
                        continue;
                    }

                    $take = min($remaining, $available);
                    $segmentStart = $free['start']->copy();
                    $segmentEnd = $segmentStart->copy()->addMinutes($take);
                    $segments[] = [
                        'segment_date' => $date->format('Y-m-d'),
                        'start_time' => $segmentStart->format('H:i:s'),
                        'end_time' => $segmentEnd->format('H:i:s'),
                        'allocated_minutes' => $take,
                        'sequence' => 1 + count(array_filter($segments, fn ($item) => $item['segment_date'] === $date->format('Y-m-d'))),
                    ];
                    $remaining -= $take;
                    if ($remaining === 0) {
                        break 3;
                    }
                }
            }
        }

        return $remaining === 0 ? $segments : null;
    }

    /** Allocate from the latest available working time, moving backward from the anchor. */
    public function allocateBackward(int $userId, Carbon $earliestDate, Carbon $anchor, int $requiredMinutes, $setting, ?int $excludeTaskId = null): ?array
    {
        if ($requiredMinutes <= 0 || $anchor->copy()->startOfDay()->lt($earliestDate->copy()->startOfDay())) {
            return null;
        }

        $segments = [];
        $remaining = $requiredMinutes;
        for ($date = $anchor->copy()->startOfDay(); $date->gte($earliestDate->copy()->startOfDay()) && $remaining > 0; $date->subDay()) {
            $windows = array_reverse($this->workingWindows($date, $setting, null, $anchor->isSameDay($date) ? $anchor : null));
            foreach ($windows as $window) {
                $freeWindows = array_reverse($this->freeWindows($userId, $date, $window, $excludeTaskId));
                foreach ($freeWindows as $free) {
                    $available = (int) $free['start']->diffInMinutes($free['end']);
                    if ($available <= 0) continue;

                    $take = min($remaining, $available);
                    $segmentEnd = $free['end']->copy();
                    $segmentStart = $segmentEnd->copy()->subMinutes($take);
                    $segments[] = [
                        'segment_date' => $date->format('Y-m-d'),
                        'start_time' => $segmentStart->format('H:i:s'),
                        'end_time' => $segmentEnd->format('H:i:s'),
                        'allocated_minutes' => $take,
                    ];
                    $remaining -= $take;
                    if ($remaining === 0) break 3;
                }
            }
        }

        if ($remaining > 0) return null;
        $segments = array_reverse($segments);
        foreach ($segments as $index => &$segment) {
            $segment['sequence'] = 1 + count(array_filter(array_slice($segments, 0, $index), fn ($item) => $item['segment_date'] === $segment['segment_date']));
        }
        unset($segment);
        return $segments;
    }

    public function allocateManual(int $userId, Carbon $startAt, Carbon $endAt, int $requiredMinutes, $setting, ?int $excludeTaskId = null): ?array
    {
        if ($requiredMinutes <= 0 || !$startAt->lt($endAt)) {
            return null;
        }

        $segments = [];
        $remaining = $requiredMinutes;
        for ($date = $startAt->copy()->startOfDay(); $date->lte($endAt->copy()->startOfDay()) && $remaining > 0; $date->addDay()) {
            foreach ($this->workingWindows($date, $setting, $startAt, $endAt) as $window) {
                if ($remaining === 0) {
                    break 2;
                }
                $available = (int) $window['start']->diffInMinutes($window['end']);
                if ($available <= 0) {
                    continue;
                }

                $take = min($remaining, $available);
                $segmentEnd = $window['start']->copy()->addMinutes($take);
                if ($this->overlapsExisting($userId, $date, $window['start'], $segmentEnd, $excludeTaskId)) {
                    return null;
                }

                $segments[] = [
                    'segment_date' => $date->format('Y-m-d'),
                    'start_time' => $window['start']->format('H:i:s'),
                    'end_time' => $segmentEnd->format('H:i:s'),
                    'allocated_minutes' => $take,
                    'sequence' => 1 + count(array_filter($segments, fn ($item) => $item['segment_date'] === $date->format('Y-m-d'))),
                ];
                $remaining -= $take;
            }
        }

        return $remaining === 0 ? $segments : null;
    }

    public function hasOverlap(int $userId, array $segments, ?int $excludeTaskId = null): bool
    {
        foreach ($segments as $segment) {
            $date = Carbon::parse($segment['segment_date']);
            $start = Carbon::parse($segment['segment_date'] . ' ' . $segment['start_time']);
            $end = Carbon::parse($segment['segment_date'] . ' ' . $segment['end_time']);
            if ($this->overlapsExisting($userId, $date, $start, $end, $excludeTaskId)) {
                return true;
            }
        }

        return false;
    }

    /** Explain available working capacity and the active segments occupying it. */
    public function availabilityReport(int $userId, Carbon $startDate, Carbon $endDate, $setting, ?int $excludeTaskId = null, ?Carbon $startAt = null, ?Carbon $rangeEnd = null): array
    {
        $availableMinutes = 0;
        $conflicts = [];
        for ($date = $startDate->copy()->startOfDay(); $date->lte($endDate->copy()->startOfDay()); $date->addDay()) {
            foreach ($this->workingWindows($date, $setting, $startAt, $rangeEnd) as $window) {
                foreach ($this->freeWindows($userId, $date, $window, $excludeTaskId) as $free) {
                    $availableMinutes += (int) $free['start']->diffInMinutes($free['end']);
                }
                $occupied = TaskSegment::query()
                    ->join('task', 'task.id', '=', 'task_segments.task_id')
                    ->where('task.user_id', $userId)
                    ->whereNull('task.deleted_at')
                    ->whereDate('task_segments.segment_date', $date->format('Y-m-d'))
                    ->where('task_segments.start_time', '<', $window['end']->format('H:i:s'))
                    ->where('task_segments.end_time', '>', $window['start']->format('H:i:s'))
                    ->when($excludeTaskId, fn ($query) => $query->where('task.id', '<>', $excludeTaskId))
                    ->orderBy('task_segments.start_time')
                    ->get(['task.id as task_id', 'task.task_name', 'task_segments.segment_date', 'task_segments.start_time', 'task_segments.end_time']);
                foreach ($occupied as $segment) {
                    $key = $segment->task_id . '|' . $segment->segment_date . '|' . $segment->start_time . '|' . $segment->end_time;
                    $conflicts[$key] = [
                        'id' => (int) $segment->task_id,
                        'task_name' => $segment->task_name,
                        'segment_date' => Carbon::parse($segment->segment_date)->format('Y-m-d'),
                        'start_time' => $segment->start_time,
                        'end_time' => $segment->end_time,
                    ];
                }
            }
        }
        return ['available_minutes' => $availableMinutes, 'conflicts' => array_values($conflicts)];
    }

    public function hasInternalOverlap(array $segments): bool
    {
        $byDate = [];
        foreach ($segments as $segment) {
            $byDate[$segment['segment_date']][] = $segment;
        }
        foreach ($byDate as $dailySegments) {
            usort($dailySegments, fn ($a, $b) => $a['start_time'] <=> $b['start_time']);
            for ($index = 1; $index < count($dailySegments); $index++) {
                if ($dailySegments[$index]['start_time'] < $dailySegments[$index - 1]['end_time']) return true;
            }
        }
        return false;
    }

    public function writeSegments($task, array $segments): void
    {
        foreach ($segments as $segment) {
            $task->segments()->create($segment);
        }
    }

    public function summarize(array $segments): array
    {
        usort($segments, fn ($a, $b) => [$a['segment_date'], $a['start_time'], $a['sequence'] ?? 0] <=> [$b['segment_date'], $b['start_time'], $b['sequence'] ?? 0]);
        $first = $segments[0];
        $last = $segments[count($segments) - 1];

        return [
            'start_date' => $first['segment_date'],
            'start_time' => $first['start_time'],
            'end_date' => $last['segment_date'],
            'end_time' => $last['end_time'],
            'total_minutes' => array_sum(array_column($segments, 'allocated_minutes')),
        ];
    }

    private function workingWindows(Carbon $date, $setting, ?Carbon $rangeStart, ?Carbon $rangeEnd): array
    {
        $workingDays = collect(explode(',', (string) $setting->working_days))
            ->map(fn ($day) => (int) trim($day))->filter(fn ($day) => $day >= 1 && $day <= 7)->all();
        if (!in_array($date->dayOfWeekIso, $workingDays, true)) {
            return [];
        }

        $holidays = $setting->holidays->pluck('holiday_date')->map(fn ($day) => Carbon::parse($day)->format('Y-m-d'))->all();
        if (in_array($date->format('Y-m-d'), $holidays, true)) {
            return [];
        }

        $workStart = Carbon::parse($setting->start_work_time);
        $workEnd = Carbon::parse($setting->end_work_time);
        $start = $date->copy()->setTime($workStart->hour, $workStart->minute, $workStart->second);
        $end = $date->copy()->setTime($workEnd->hour, $workEnd->minute, $workEnd->second);
        if ($rangeStart && $date->isSameDay($rangeStart)) {
            $start = $start->max($rangeStart);
        }
        if ($rangeEnd && $date->isSameDay($rangeEnd)) {
            $end = $end->min($rangeEnd);
        }
        if (!$start->lt($end)) {
            return [];
        }

        $windows = [['start' => $start, 'end' => $end]];
        if ($setting->start_break_time && $setting->end_break_time) {
            $breakStartValue = Carbon::parse($setting->start_break_time);
            $breakEndValue = Carbon::parse($setting->end_break_time);
            $breakStart = $date->copy()->setTime($breakStartValue->hour, $breakStartValue->minute, $breakStartValue->second);
            $breakEnd = $date->copy()->setTime($breakEndValue->hour, $breakEndValue->minute, $breakEndValue->second);
            $windows = $this->subtractWindow($windows, $breakStart, $breakEnd);
        }

        return $windows;
    }

    private function freeWindows(int $userId, Carbon $date, array $window, ?int $excludeTaskId): array
    {
        $busy = TaskSegment::query()
            ->join('task', 'task.id', '=', 'task_segments.task_id')
            ->where('task.user_id', $userId)
            ->whereNull('task.deleted_at')
            ->whereDate('task_segments.segment_date', $date->format('Y-m-d'))
            ->when($excludeTaskId, fn ($query) => $query->where('task.id', '<>', $excludeTaskId))
            ->orderBy('task_segments.start_time')
            ->get(['task_segments.start_time', 'task_segments.end_time']);

        $free = [$window];
        foreach ($busy as $occupied) {
            $busyStart = $date->copy()->setTimeFromTimeString($occupied->start_time);
            $busyEnd = $date->copy()->setTimeFromTimeString($occupied->end_time);
            $free = $this->subtractWindow($free, $busyStart, $busyEnd);
        }

        return $free;
    }

    private function overlapsExisting(int $userId, Carbon $date, Carbon $start, Carbon $end, ?int $excludeTaskId): bool
    {
        return TaskSegment::query()
            ->join('task', 'task.id', '=', 'task_segments.task_id')
            ->where('task.user_id', $userId)
            ->whereNull('task.deleted_at')
            ->whereDate('task_segments.segment_date', $date->format('Y-m-d'))
            ->where('task_segments.start_time', '<', $end->format('H:i:s'))
            ->where('task_segments.end_time', '>', $start->format('H:i:s'))
            ->when($excludeTaskId, fn ($query) => $query->where('task.id', '<>', $excludeTaskId))
            ->exists();
    }

    private function subtractWindow(array $windows, Carbon $blockedStart, Carbon $blockedEnd): array
    {
        $remaining = [];
        foreach ($windows as $window) {
            if (!$blockedStart->lt($window['end']) || !$blockedEnd->gt($window['start'])) {
                $remaining[] = $window;
                continue;
            }

            if ($window['start']->lt($blockedStart)) {
                $remaining[] = ['start' => $window['start']->copy(), 'end' => $blockedStart->copy()];
            }
            if ($blockedEnd->lt($window['end'])) {
                $remaining[] = ['start' => $blockedEnd->copy(), 'end' => $window['end']->copy()];
            }
        }

        return array_values(array_filter($remaining, fn ($window) => $window['start']->lt($window['end'])));
    }
}
