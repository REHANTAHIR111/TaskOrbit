<?php

namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Task;
use App\Models\SlotSetting;
use App\Models\Holiday;
use Carbon\Carbon;
use Validator;


class TaskController extends Controller
{
    // public function create(Request $request) {
    //     $userID = $request->user_id;
    //     $settingFilled = false;
        
    //     $SlotSetting = SlotSetting::where('user_id', $userID)->where('status', '1')->first();

    //     if($SlotSetting) {
    //         $settingFilled = true;
    //     }

    //     return response()->json([
    //         'setting_filled' => $settingFilled,
    //     ], 200);
    // }

    public function create(Request $request)
    {
        $userID = $request->user_id;
        $settingFilled = false;
        
        $slotSetting = SlotSetting::where('user_id', $userID)->where('status', '1')->first();

        if($slotSetting) {
            $settingFilled = true;
        }

        return response()->json([
            'setting_filled' => $settingFilled,
        ], 200);
    }

    public function getTask(Request $request) {
        $userID = $request->id;
        $data = Task::with('segments')->where('user_id', $userID)->orderByDesc('id')->get();
        $data->each(fn ($task) => $task->setAttribute('total_allocated_minutes', (int) $task->segments->sum('allocated_minutes')));

        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => 'Tasks retrieved successfully'
        ], 200);
    }

    // public function store(Request $request) {
    //     $userID = $request->user_id;
    //     $SettingWorkDays = null;
    //     $startDate = $request->start_date;
    //     $SettingHoldays = '';
    //     $AvailableStartDate = '';
    //     $AvailableEndDate = '';
    //     $Holiday = '';
    //     $AvailableStartTime = '';
    //     $FinalCalculatedEndTime = '';
        
    //     $SlotSetting = SlotSetting::with('holidays:id,setting_id,holiday_date')->where('user_id', $userID)->where('status', '1')->first();
    //     $PrevTask = Task::where('user_id', $userID)->orderByDesc('id')->first();

    //     if($SlotSetting) {
    //         $SettingWorkDays = explode(',', $SlotSetting->working_days);
    //         $startDay = Carbon::parse($startDate)->dayOfWeekIso;
    //         $SettingHoldays = Carbon::parse($SlotSetting->holiday_date)->dayOfWeekIso;

    //         $Holiday = $SlotSetting->holidays->contains(function ($holiday) use ($startDate) {
    //             return Carbon::parse($holiday->holiday_date)->isSameDay($startDate);
    //         });

    //         if(in_array($startDay, $SettingWorkDays) && !$Holiday) {
    //             $currentTime = now()->format('h:i');;
    //             $settingStartTime = $SlotSetting->start_work_time;
    //             $settingEndTime = $SlotSetting->end_work_time;

    //             if(!$PrevTask) { 
    //                 if($currentTime >= $settingStartTime || $currentTime <= $settingEndTime) {
    //                     $AvailableStartTime = $currentTime;

                        
    //                     // $CalculatedEndTime = Carbon::parse($AvailableStartTime)->addHours((float) $request->hour)->format('h:i');

    //                     // $ParedAvailableSTime = Carbon::parse($AvailableStartTime);
    //                     // $ParsedSettingEndTime = Carbon::parse($settingEndTime);

    //                     // $remainingTime = $ParedAvailableSTime->diffInMinutes($ParsedSettingEndTime);
    //                     // echo $remainingTime; die();
    //                     // if() {
    //                     // }
    //                 } 
    //                 else {
    //                     // $AvailableStartDate = 
    //                 }
    //             } 
    //             else {
                        
    //             }

    //         }
    //     }

    //     $store = Task::Create([
    //         'user_id' => $request->user_id,
    //         'task_name' => $request->task_name,
    //         'description' => $request->description,
    //         'priority' => $request->priority,
    //         'status' => $request->status,
    //         'hour' => $request->hour,
    //         'start_date' => $request->start_date,
    //         'end_date' => $request->end_date,
    //         'start_time' => $request->start_time,
    //         'end_time' => $request->end_time,
    //     ]);

    //     return response()->json([
    //         'success' => 'true',
    //         'message' => 'Task has been created Successfully!'
    //     ]);
    // }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|integer',
            'task_name' => 'required|string|max:255',
            'hour' => 'required|numeric|min:0.01',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'description' => 'nullable|string',
            'priority' => 'nullable|string',
            'status' => 'nullable|in:0,1',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        try {
            return DB::transaction(function () use ($request) {
                $user = DB::table('users')->where('id', $request->user_id)->lockForUpdate()->first();
                if (!$user) {
                    return response()->json(['success' => false, 'message' => 'User not found.'], 404);
                }

                $setting = SlotSetting::with('holidays')->where('user_id', $request->user_id)->first();
                $active = $setting && (string) $setting->status === '1';
                if ($active && (empty($request->start_time) || empty($request->end_time))) {
                    return $this->autoScheduleTask($request, $setting);
                }
                return $this->manualScheduleTask($request, $setting);
            });
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Error creating task: ' . $e->getMessage()], 500);
        }
    }

    private function autoScheduleTask(Request $request, $setting, ?int $taskId = null)
    {
        if (empty($setting->working_days) || empty($setting->start_work_time) || empty($setting->end_work_time)) {
            return response()->json(['success' => false, 'message' => 'Please complete your working days and working hours settings before creating a task.'], 422);
        }

        $break = $this->getValidatedBreakSetting($setting);
        if ($break['invalid']) {
            return response()->json(['success' => false, 'message' => $break['message']], 422);
        }
        $workStart = Carbon::parse($setting->start_work_time);
        $workEnd = Carbon::parse($setting->end_work_time);
        if (!$workStart->lt($workEnd)) {
            return response()->json(['success' => false, 'message' => 'End working time must be after start working time.'], 422);
        }
        if ($break['has_break'] && (
            $break['start']->format('H:i:s') < $workStart->format('H:i:s') ||
            $break['end']->format('H:i:s') > $workEnd->format('H:i:s')
        )) {
            return response()->json(['success' => false, 'message' => 'Break times must be within working hours.'], 422);
        }

        $startDate = Carbon::parse($request->start_date)->startOfDay();
        $endDate = Carbon::parse($request->end_date)->startOfDay();
        if ($startDate->lt(Carbon::today())) {
            $startDate = Carbon::today();
        }
        $startAt = null;
        if ($request->filled('start_time')) {
            $startAt = Carbon::parse($startDate->format('Y-m-d') . ' ' . $request->start_time);
            if ($startDate->isToday() && $startAt->lt(now())) {
                $startAt = now();
            }
        } elseif ($startDate->isToday()) {
            $startAt = now();
        }
        $minutes = (int) round(((float) $request->hour) * 60);
        $scheduler = new \App\Services\TaskSchedulingService();
        $segments = $scheduler->allocate((int) $request->user_id, $startDate, $endDate, $minutes, $setting, $taskId, $startAt);
        if (!$segments) {
            return response()->json([
                'success' => false,
                'message' => 'Not enough available working time in the selected date range to schedule the full task duration.',
                'details' => ['required_minutes' => $minutes, 'date_range' => ['start' => $startDate->format('Y-m-d'), 'end' => $endDate->format('Y-m-d')]],
            ], 422);
        }

        $task = $this->saveTaskAndSegments($request, $segments, $taskId);
        return response()->json([
            'success' => true,
            'message' => $taskId ? 'Task updated and automatically rescheduled.' : 'Task created successfully with automatic scheduling.',
            'data' => ['task' => $task->load('segments'), 'segments' => $task->segments, 'total_allocated_minutes' => $minutes],
        ], $taskId ? 200 : 201);
    }

    private function manualScheduleTask(Request $request, $setting, ?int $excludeTaskId = null)
    {
        if (!$request->start_time || !$request->end_time) {
            return response()->json(['success' => false, 'message' => 'Please provide start time and end time for manual scheduling.'], 422);
        }

        if ($setting) {
            if (empty($setting->working_days) || empty($setting->start_work_time) || empty($setting->end_work_time)) {
                return response()->json(['success' => false, 'message' => 'Please complete your working days and working hours settings before creating a task.'], 422);
            }
            $break = $this->getValidatedBreakSetting($setting);
            if ($break['invalid']) {
                return response()->json(['success' => false, 'message' => $break['message']], 422);
            }
            $workStart = Carbon::parse($setting->start_work_time);
            $workEnd = Carbon::parse($setting->end_work_time);
            if (!$workStart->lt($workEnd)) {
                return response()->json(['success' => false, 'message' => 'End working time must be after start working time.'], 422);
            }
            if ($break['has_break'] && (
                $break['start']->format('H:i:s') < $workStart->format('H:i:s') ||
                $break['end']->format('H:i:s') > $workEnd->format('H:i:s')
            )) {
                return response()->json(['success' => false, 'message' => 'Break times must be within working hours.'], 422);
            }
        } else {
            $setting = (object) [
                'working_days' => '1,2,3,4,5,6,7',
                'start_work_time' => '00:00:00',
                'end_work_time' => '23:59:59',
                'start_break_time' => null,
                'end_break_time' => null,
                'holidays' => collect(),
            ];
        }

        $startAt = Carbon::parse($request->start_date . ' ' . $request->start_time);
        $endAt = Carbon::parse($request->end_date . ' ' . $request->end_time);
        if (!$startAt->lt($endAt)) {
            return response()->json(['success' => false, 'message' => 'End date and time must be after the start date and time.'], 422);
        }

        $minutes = (int) round(((float) $request->hour) * 60);
        $scheduler = new \App\Services\TaskSchedulingService();
        $segments = $scheduler->allocateManual((int) $request->user_id, $startAt, $endAt, $minutes, $setting, $excludeTaskId);
        if (!$segments) {
            return response()->json([
                'success' => false,
                'message' => 'The requested schedule cannot fit the full duration within working periods, or one of its segments overlaps an existing task.',
            ], 422);
        }

        $task = $this->saveTaskAndSegments($request, $segments, $excludeTaskId);
        return response()->json([
            'success' => true,
            'message' => $excludeTaskId ? 'Task updated successfully.' : 'Task created successfully with manual scheduling.',
            'data' => ['task' => $task->load('segments'), 'segments' => $task->segments, 'total_allocated_minutes' => $minutes],
        ], $excludeTaskId ? 200 : 201);
    }

    private function saveTaskAndSegments(Request $request, array $segments, ?int $taskId = null): Task
    {
        $scheduler = new \App\Services\TaskSchedulingService();
        $summary = $scheduler->summarize($segments);
        $task = $taskId ? Task::whereKey($taskId)->lockForUpdate()->firstOrFail() : new Task();
        $task->fill([
            'user_id' => $request->user_id,
            'task_name' => $request->task_name,
            'description' => $request->description,
            'priority' => $request->priority,
            'status' => $request->status ?? '0',
            // Keep the legacy duration column aligned with the rounded,
            // minute-based allocation stored by the scheduler.
            'hour' => $summary['total_minutes'] / 60,
            'start_date' => $summary['start_date'],
            'end_date' => $summary['end_date'],
            'start_time' => $summary['start_time'],
            'end_time' => $summary['end_time'],
        ]);
        $task->save();
        if ($taskId) {
            $task->segments()->delete();
        }
        $scheduler->writeSegments($task, $segments);
        return $task;
    }

    /** Validate optional break fields and return normalized Carbon times. */
    private function getValidatedBreakSetting($setting): array
    {
        $startValue = $setting->start_break_time;
        $endValue = $setting->end_break_time;
        $hasStart = $startValue !== null && trim((string) $startValue) !== '';
        $hasEnd = $endValue !== null && trim((string) $endValue) !== '';
        if ($hasStart !== $hasEnd) {
            return ['invalid' => true, 'message' => 'Both break start and break end times must be set, or both must be empty.', 'has_break' => false, 'start' => null, 'end' => null];
        }
        if (!$hasStart) {
            return ['invalid' => false, 'message' => null, 'has_break' => false, 'start' => null, 'end' => null];
        }

        $startValue = trim((string) $startValue);
        $endValue = trim((string) $endValue);
        $normalizedStart = strlen($startValue) === 5 ? $startValue . ':00' : $startValue;
        $normalizedEnd = strlen($endValue) === 5 ? $endValue . ':00' : $endValue;
        try {
            $start = Carbon::createFromFormat('!H:i:s', $normalizedStart);
            $end = Carbon::createFromFormat('!H:i:s', $normalizedEnd);
        } catch (\Throwable $e) {
            $start = false;
            $end = false;
        }
        if (!$start || !$end || $start->format('H:i:s') !== $normalizedStart || $end->format('H:i:s') !== $normalizedEnd || !$start->lt($end)) {
            return ['invalid' => true, 'message' => 'Break end time must be after break start time, using valid times.', 'has_break' => false, 'start' => null, 'end' => null];
        }
        return ['invalid' => false, 'message' => null, 'has_break' => true, 'start' => $start, 'end' => $end];
    }

    /**
     * Get last task for user
     */
    public function lastTask(Request $request)
    {
        $userID = $request->user_id;
        
        $lastTask = Task::where('user_id', $userID)
            ->whereNull('deleted_at')
            ->orderByDesc('id')
            ->first();

        return response()->json([
            'success' => true,
            'data' => $lastTask
        ]);
    }

    // public function store(Request $request)
    // {
    //     $userID = $request->user_id;

    //     $request->validate([
    //         'user_id'    => 'required',
    //         'task_name'  => 'required|string',
    //         'start_date' => 'required|date',
    //         'end_date'   => 'required|date|after_or_equal:start_date',
    //         'hour'       => 'required|numeric|min:0.01',
    //     ]);

    //     $slotSetting = SlotSetting::with([
    //         'holidays:id,setting_id,holiday_date'
    //     ])
    //         ->where('user_id', $userID)
    //         ->where('status', '1')
    //         ->first();

    //     if (!$slotSetting) {
    //         return response()->json([
    //             'success' => false,
    //             'message' => 'Working time settings not configured.'
    //         ], 422);
    //     }

    //     /*
    //     |--------------------------------------------------------------------------
    //     | HELPER FUNCTION: Format minutes to human readable
    //     |--------------------------------------------------------------------------
    //     */
    //     $formatMinutes = function($minutes) {
    //         $hours = floor($minutes / 60);
    //         $mins = $minutes % 60;
            
    //         if ($hours > 0 && $mins > 0) {
    //             return $hours . 'h ' . $mins . 'm';
    //         } elseif ($hours > 0) {
    //             return $hours . 'h';
    //         } else {
    //             return $mins . 'm';
    //         }
    //     };

    //     /*
    //     |--------------------------------------------------------------------------
    //     | SETTINGS
    //     |--------------------------------------------------------------------------
    //     */

    //     $workingDays = collect(
    //         array_filter(
    //             explode(',', $slotSetting->working_days)
    //         )
    //     )
    //         ->map(fn($day) => (int) trim($day))
    //         ->values()
    //         ->toArray();

    //     $workingStart = Carbon::parse($slotSetting->start_work_time);
    //     $workingEnd   = Carbon::parse($slotSetting->end_work_time);

    //     $requestedStartDate = Carbon::parse($request->start_date)->startOfDay();
    //     $requestedEndDate   = Carbon::parse($request->end_date)->startOfDay();

    //     $requiredMinutes = (int) round(((float) $request->hour) * 60);

    //     /*
    //     |--------------------------------------------------------------------------
    //     | HELPERS
    //     |--------------------------------------------------------------------------
    //     */

    //     $isHoliday = function (Carbon $date) use ($slotSetting) {
    //         return $slotSetting->holidays->contains(function ($holiday) use ($date) {
    //             return Carbon::parse($holiday->holiday_date)->isSameDay($date);
    //         });
    //     };

    //     $isWorkingDay = function (Carbon $date) use ($workingDays) {
    //         return in_array(
    //             $date->dayOfWeekIso,
    //             $workingDays
    //         );
    //     };

    //     /*
    //     |--------------------------------------------------------------------------
    //     | FIND PREVIOUS TASK
    //     |--------------------------------------------------------------------------
    //     */

    //     $prevTask = Task::where('user_id', $userID)
    //         ->whereNull('deleted_at')
    //         ->orderByDesc('id')
    //         ->first();

    //     $currentDate = $requestedStartDate->copy();

    //     if ($prevTask && $prevTask->end_date && $prevTask->end_time) {
    //         $previousEnd = Carbon::parse(
    //             $prevTask->end_date . ' ' . $prevTask->end_time
    //         );

    //         $requestedStartDateTime = $requestedStartDate
    //             ->copy()
    //             ->startOfDay();

    //         if ($previousEnd->greaterThan($requestedStartDateTime)) {
    //             $currentDate = $previousEnd->copy()->startOfDay();
    //         }
    //     }

    //     /*
    //     |--------------------------------------------------------------------------
    //     | SCHEDULING VARIABLES
    //     |--------------------------------------------------------------------------
    //     */

    //     $remainingMinutes = $requiredMinutes;

    //     $actualStartDate = null;
    //     $actualEndDate   = null;
    //     $actualStartTime = null;
    //     $actualEndTime   = null;

    //     $skippedDays = [];
    //     $totalAvailableMinutes = 0;

    //     /*
    //     |--------------------------------------------------------------------------
    //     | SCHEDULING
    //     |--------------------------------------------------------------------------
    //     */

    //     while ($currentDate->lte($requestedEndDate)) {
    //         $isHolidayToday = $isHoliday($currentDate);
    //         $isWorkingDayToday = $isWorkingDay($currentDate);

    //         if (!$isWorkingDayToday || $isHolidayToday) {
    //             $skippedDays[] = $currentDate->format('D, M d');
    //             $currentDate->addDay();
    //             continue;
    //         }

    //         $dayStart = $currentDate->copy()->setTime(
    //             $workingStart->hour,
    //             $workingStart->minute,
    //             0
    //         );

    //         $dayEnd = $currentDate->copy()->setTime(
    //             $workingEnd->hour,
    //             $workingEnd->minute,
    //             0
    //         );

    //         $breakStart = null;
    //         $breakEnd   = null;

    //         if (
    //             !empty($slotSetting->start_break_time) &&
    //             !empty($slotSetting->end_break_time)
    //         ) {
    //             $breakStartValue = Carbon::parse(
    //                 $slotSetting->start_break_time
    //             );

    //             $breakEndValue = Carbon::parse(
    //                 $slotSetting->end_break_time
    //             );

    //             $breakStart = $currentDate->copy()->setTime(
    //                 $breakStartValue->hour,
    //                 $breakStartValue->minute,
    //                 0
    //             );

    //             $breakEnd = $currentDate->copy()->setTime(
    //                 $breakEndValue->hour,
    //                 $breakEndValue->minute,
    //                 0
    //             );
    //         }

    //         if ($currentDate->isToday()) {
    //             $now = now();
                
    //             if ($now->lt($dayStart)) {
    //                 $availableStart = $dayStart->copy();
    //             } elseif ($now->gte($dayEnd)) {
    //                 $currentDate->addDay();
    //                 continue;
    //             } else {
    //                 $availableStart = $now->copy();
    //             }
    //         } else {
    //             $availableStart = $dayStart->copy();
    //         }

    //         if (
    //             $prevTask &&
    //             $prevTask->end_date &&
    //             $prevTask->end_time
    //         ) {
    //             $previousEnd = Carbon::parse(
    //                 $prevTask->end_date . ' ' . $prevTask->end_time
    //             );

    //             if ($previousEnd->isSameDay($currentDate)) {
    //                 $previousTaskStart = $previousEnd
    //                     ->copy()
    //                     ->addMinute();

    //                 if ($previousTaskStart->gt($availableStart)) {
    //                     $availableStart = $previousTaskStart;
    //                 }
    //             }
    //         }

    //         if (
    //             $breakStart &&
    //             $breakEnd &&
    //             $availableStart->gte($breakStart) &&
    //             $availableStart->lt($breakEnd)
    //         ) {
    //             $availableStart = $breakEnd->copy();
    //         }

    //         if ($availableStart->gte($dayEnd)) {
    //             $currentDate->addDay();
    //             continue;
    //         }

    //         $existingTasks = Task::where('user_id', $userID)
    //             ->whereNull('deleted_at')
    //             ->whereDate('start_date', '<=', $currentDate->format('Y-m-d'))
    //             ->whereDate('end_date', '>=', $currentDate->format('Y-m-d'))
    //             ->whereNotNull('start_time')
    //             ->whereNotNull('end_time')
    //             ->when($prevTask, function ($query) use ($prevTask) {
    //                 $query->where('id', '!=', $prevTask->id);
    //             })
    //             ->orderBy('start_time')
    //             ->get();

    //         $busyPeriods = [];

    //         foreach ($existingTasks as $task) {
    //             $taskStart = Carbon::parse(
    //                 $currentDate->format('Y-m-d') . ' ' . $task->start_time
    //             );

    //             $taskEnd = Carbon::parse(
    //                 $currentDate->format('Y-m-d') . ' ' . $task->end_time
    //             );

    //             if ($taskStart->lt($taskEnd)) {
    //                 $busyPeriods[] = [
    //                     'start' => $taskStart,
    //                     'end'   => $taskEnd,
    //                 ];
    //             }
    //         }

    //         if (
    //             $breakStart &&
    //             $breakEnd &&
    //             $breakStart->lt($breakEnd)
    //         ) {
    //             $busyPeriods[] = [
    //                 'start' => $breakStart->copy(),
    //                 'end'   => $breakEnd->copy(),
    //             ];
    //         }

    //         usort($busyPeriods, function ($a, $b) {
    //             return $a['start']->timestamp <=> $b['start']->timestamp;
    //         });

    //         $mergedBusyPeriods = [];

    //         foreach ($busyPeriods as $busy) {
    //             if (empty($mergedBusyPeriods)) {
    //                 $mergedBusyPeriods[] = $busy;
    //                 continue;
    //             }

    //             $lastIndex = count($mergedBusyPeriods) - 1;

    //             if ($busy['start']->lte($mergedBusyPeriods[$lastIndex]['end'])) {
    //                 if ($busy['end']->gt($mergedBusyPeriods[$lastIndex]['end'])) {
    //                     $mergedBusyPeriods[$lastIndex]['end'] = $busy['end'];
    //                 }
    //             } else {
    //                 $mergedBusyPeriods[] = $busy;
    //             }
    //         }

    //         $freePeriods = [];
    //         $cursor = $availableStart->copy();

    //         if ($cursor->lt($dayStart)) {
    //             $cursor = $dayStart->copy();
    //         }

    //         $filteredBusyPeriods = array_filter($mergedBusyPeriods, function($busy) use ($cursor) {
    //             return $busy['end'] > $cursor;
    //         });
    //         $filteredBusyPeriods = array_values($filteredBusyPeriods);

    //         if (empty($filteredBusyPeriods)) {
    //             if ($cursor->lt($dayEnd)) {
    //                 $freePeriods[] = [
    //                     'start' => $cursor->copy(),
    //                     'end' => $dayEnd->copy(),
    //                 ];
    //             }
    //         } else {
    //             $currentCursor = $cursor->copy();
                
    //             foreach ($filteredBusyPeriods as $busy) {
    //                 if ($busy['end']->lte($currentCursor)) {
    //                     continue;
    //                 }

    //                 if ($busy['start']->gt($currentCursor)) {
    //                     $freeStart = $currentCursor->copy();
    //                     $freeEnd = $busy['start']->copy();
                        
    //                     if ($freeEnd->gt($dayEnd)) {
    //                         $freeEnd = $dayEnd->copy();
    //                     }
                        
    //                     if ($freeStart->lt($freeEnd)) {
    //                         $freePeriods[] = [
    //                             'start' => $freeStart,
    //                             'end' => $freeEnd,
    //                         ];
    //                     }
    //                 }

    //                 if ($busy['end']->gt($currentCursor)) {
    //                     $currentCursor = $busy['end']->copy();
    //                 }

    //                 if ($currentCursor->gte($dayEnd)) {
    //                     break;
    //                 }
    //             }

    //             if ($currentCursor->lt($dayEnd)) {
    //                 $freePeriods[] = [
    //                     'start' => $currentCursor->copy(),
    //                     'end' => $dayEnd->copy(),
    //                 ];
    //             }
    //         }

    //         $dayAvailableMinutes = 0;
    //         foreach ($freePeriods as $period) {
    //             $dayAvailableMinutes += $period['start']->diffInMinutes($period['end']);
    //         }
    //         $totalAvailableMinutes += $dayAvailableMinutes;

    //         foreach ($freePeriods as $period) {
    //             if ($remainingMinutes <= 0) {
    //                 break;
    //             }

    //             $periodStart = $period['start']->copy();
    //             $periodEnd = $period['end']->copy();

    //             $availableMinutes = $periodStart->diffInMinutes($periodEnd);

    //             if ($availableMinutes <= 0) {
    //                 continue;
    //             }

    //             if (!$actualStartDate) {
    //                 $actualStartDate = $currentDate->copy();
    //                 $actualStartTime = $periodStart->format('H:i:s');
    //             }

    //             if ($remainingMinutes <= $availableMinutes) {
    //                 $actualEndDate = $currentDate->copy();
    //                 $actualEndTime = $periodStart
    //                     ->copy()
    //                     ->addMinutes($remainingMinutes)
    //                     ->format('H:i:s');

    //                 $remainingMinutes = 0;
    //                 break;
    //             } else {
    //                 $remainingMinutes -= $availableMinutes;

    //                 $actualEndDate = $currentDate->copy();
    //                 $actualEndTime = $periodEnd->format('H:i:s');
    //             }
    //         }

    //         if ($remainingMinutes > 0) {
    //             $currentDate->addDay();
    //             continue;
    //         }

    //         break;
    //     }

    //     /*
    //     |--------------------------------------------------------------------------
    //     | NOT ENOUGH AVAILABLE TIME - CLEAR & CONCISE MESSAGES
    //     |--------------------------------------------------------------------------
    //     */

    //     if ($remainingMinutes > 0) {
    //         $requiredFormatted = $formatMinutes($requiredMinutes);
    //         $availableFormatted = $formatMinutes($totalAvailableMinutes);
    //         $shortByFormatted = $formatMinutes($remainingMinutes);
            
    //         // Build the message
    //         $parts = [];
            
    //         // 1. Time shortage
    //         $parts[] = 'Need ' . $requiredFormatted . ', available ' . $availableFormatted;
            
    //         // 2. Skipped days if any
    //         if (!empty($skippedDays)) {
    //             $count = count($skippedDays);
    //             $parts[] = $count . ' day' . ($count > 1 ? 's' : '') . ' not working';
                
    //             // Show first 2 days as example
    //             if ($count <= 2) {
    //                 $parts[] = '(' . implode(', ', $skippedDays) . ')';
    //             } else {
    //                 $parts[] = '(' . implode(', ', array_slice($skippedDays, 0, 2)) . ' & ' . ($count - 2) . ' more)';
    //             }
    //         }
            
    //         // 3. Action needed
    //         if (!empty($skippedDays)) {
    //             $parts[] = '→ Change dates or reduce ' . $shortByFormatted;
    //         } else {
    //             $parts[] = '→ Extend end date or reduce ' . $shortByFormatted;
    //         }
            
    //         $message = implode(' | ', $parts);
            
    //         return response()->json([
    //             'success' => false,
    //             'message' => $message,
    //             'data' => [
    //                 'required' => $requiredFormatted,
    //                 'available' => $availableFormatted,
    //                 'short_by' => $shortByFormatted,
    //                 'skipped_days' => $skippedDays,
    //                 'skipped_count' => count($skippedDays),
    //             ]
    //         ], 422);
    //     }

    //     /*
    //     |--------------------------------------------------------------------------
    //     | CREATE TASK
    //     |--------------------------------------------------------------------------
    //     */

    //     $store = Task::create([
    //         'user_id'     => $userID,
    //         'task_name'   => $request->task_name,
    //         'description' => $request->description,
    //         'priority'    => $request->priority,
    //         'status'      => $request->status,
    //         'hour'        => $request->hour,
    //         'start_date'  => $actualStartDate->format('Y-m-d'),
    //         'end_date'    => $actualEndDate->format('Y-m-d'),
    //         'start_time'  => $actualStartTime,
    //         'end_time'    => $actualEndTime,
    //     ]);

    //     return response()->json([
    //         'success' => true,
    //         'message' => 'Task created successfully!',
    //         'data' => [
    //             'task_id'           => $store->id,
    //             'requested_start'   => $request->start_date,
    //             'requested_end'     => $request->end_date,
    //             'actual_start_date' => $actualStartDate?->format('Y-m-d'),
    //             'actual_end_date'   => $actualEndDate?->format('Y-m-d'),
    //             'actual_start_time' => $actualStartTime,
    //             'actual_end_time'   => $actualEndTime,
    //         ]
    //     ]);
    // }

    public function edit(Request $request, $id)
    {
        $task = Task::with('segments')->find($id);
        if (!$task) {
            return response()->json(['editdata' => null, 'success' => false, 'message' => 'Task not found.'], 404);
        }
        $totalMinutes = (int) $task->segments->sum('allocated_minutes');
        $settingActive = SlotSetting::where('user_id', $task->user_id)->where('status', '1')->exists();
        return response()->json([
            'editdata' => $task,
            'segments' => $task->segments,
            'total_allocated_minutes' => $totalMinutes,
            'auto_schedule_available' => $settingActive,
        ]);
    }

    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'task_name' => 'required|string|max:255',
            'hour' => 'required|numeric|min:0.01',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'description' => 'nullable|string',
            'priority' => 'nullable|string',
            'status' => 'nullable|in:0,1',
            'reflow_mode' => 'nullable|in:keep,backfill,forward,manual',
            'schedule_changed' => 'nullable|boolean',
            'reflow_task_ids' => 'nullable|array',
            'reflow_task_ids.*' => 'integer|min:1',
            'reflow_task_schedules' => 'nullable|array',
            'reflow_task_schedules.*.task_id' => 'required_with:reflow_task_schedules|integer|min:1',
            'reflow_task_schedules.*.start_date' => 'required_with:reflow_task_schedules|date',
            'reflow_task_schedules.*.start_time' => 'required_with:reflow_task_schedules|date_format:H:i',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        try {
            return DB::transaction(function () use ($request, $id) {
                $initial = Task::whereKey($id)->first();
                if (!$initial) {
                    return response()->json(['success' => false, 'message' => 'Task not found.'], 404);
                }
                DB::table('users')->where('id', $initial->user_id)->lockForUpdate()->first();
                $task = Task::whereKey($id)->lockForUpdate()->first();
                if (!$task || (int) $task->user_id !== (int) $initial->user_id) {
                    return response()->json(['success' => false, 'message' => 'Task changed while the update was starting. Please retry.'], 409);
                }
                if ($request->exists('schedule_changed') && !$request->boolean('schedule_changed') && !$request->boolean('auto_schedule')) {
                    $task->fill([
                        'task_name' => $request->task_name,
                        'description' => $request->description,
                        'priority' => $request->priority,
                        'status' => $request->status ?? $task->status,
                    ])->save();
                    return response()->json(['success' => true, 'message' => 'Task details updated. Its schedule was kept unchanged.', 'data' => ['task' => $task->load('segments')]]);
                }
                $request->merge(['user_id' => $task->user_id]);
                $setting = SlotSetting::with('holidays')->where('user_id', $task->user_id)->first();
                if ($request->boolean('auto_schedule') && (!$setting || (string) $setting->status !== '1')) {
                    return response()->json(['success' => false, 'message' => 'Active working-time settings are required for automatic scheduling.'], 422);
                }
                if ($setting) {
                    $problem = $this->schedulingSettingsProblem($setting);
                    if ($problem) return response()->json(['success' => false, 'message' => $problem], 422);
                }
                $result = $this->buildEditedTaskPlan($request, $task, $setting, (string) $request->input('reflow_mode', 'keep'));
                if (!$result['success']) return response()->json($result, 422);
                return response()->json([
                    'success' => true,
                    'message' => 'Task and selected schedule changes were saved.',
                    'data' => $result,
                ]);
            });
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Task update failed: ' . $e->getMessage()], 422);
        }
    }

    public function previewTaskSchedule(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'hour' => 'required|numeric|min:0.01',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'auto_schedule' => 'nullable|boolean',
            'reflow_mode' => 'nullable|in:keep,backfill,forward,manual',
            'reflow_task_ids' => 'nullable|array',
            'reflow_task_ids.*' => 'integer|min:1',
            'reflow_task_schedules' => 'nullable|array',
            'reflow_task_schedules.*.task_id' => 'required_with:reflow_task_schedules|integer|min:1',
            'reflow_task_schedules.*.start_date' => 'required_with:reflow_task_schedules|date',
            'reflow_task_schedules.*.start_time' => 'required_with:reflow_task_schedules|date_format:H:i',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Check the duration and selected dates.', 'errors' => $validator->errors()], 422);
        }

        $connection = DB::connection();
        $connection->beginTransaction();
        try {
            $initial = Task::whereKey($id)->first();
            if (!$initial) {
                $connection->rollBack();
                return response()->json(['success' => false, 'message' => 'Task not found.'], 404);
            }
            DB::table('users')->where('id', $initial->user_id)->lockForUpdate()->first();
            $task = Task::with('segments')->whereKey($id)->lockForUpdate()->first();
            $setting = SlotSetting::with('holidays')->where('user_id', $task->user_id)->first();
            if ($request->boolean('auto_schedule') && (!$setting || (string) $setting->status !== '1')) {
                $connection->rollBack();
                return response()->json(['success' => false, 'message' => 'Active working-time settings are required for automatic scheduling.'], 422);
            }
            if ($setting) {
                $problem = $this->schedulingSettingsProblem($setting);
                if ($problem) {
                    $connection->rollBack();
                    return response()->json(['success' => false, 'message' => $problem], 422);
                }
            }
            $request->merge(['user_id' => $task->user_id]);
            $result = $this->buildEditedTaskPlan($request, $task, $setting, (string) $request->input('reflow_mode', 'keep'));
            $connection->rollBack();
            return response()->json($result, $result['success'] ? 200 : 422);
        } catch (\Throwable $e) {
            if ($connection->transactionLevel() > 0) $connection->rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /** Build and apply an edit plan inside the caller's transaction. Preview callers always roll it back. */
    private function buildEditedTaskPlan(Request $request, Task $task, $setting, string $mode): array
    {
        if (!in_array($mode, ['keep', 'backfill', 'forward', 'manual'], true)) {
            return ['success' => false, 'message' => 'Choose how later tasks should be handled.'];
        }
        if ($mode !== 'keep' && !$setting) {
            return ['success' => false, 'message' => 'Add working hours before moving other tasks.'];
        }
        $request->merge([
            'user_id' => $task->user_id,
            'task_name' => $request->input('task_name', $task->task_name),
            'description' => $request->input('description', $task->description),
            'priority' => $request->input('priority', $task->priority),
            'status' => $request->input('status', $task->status),
        ]);
        $scheduler = new \App\Services\TaskSchedulingService();
        $oldSegments = $task->segments->map(fn ($segment) => [
            'segment_date' => $segment->segment_date->format('Y-m-d'),
            'start_time' => $segment->start_time,
            'end_time' => $segment->end_time,
            'allocated_minutes' => (int) $segment->allocated_minutes,
        ])->values()->all();
        $startDate = Carbon::parse($request->start_date)->startOfDay();
        if ($request->boolean('auto_schedule') && $startDate->lt(Carbon::today())) $startDate = Carbon::today();
        $endDate = Carbon::parse($request->end_date)->startOfDay();
        $startAt = $request->filled('start_time')
            ? Carbon::parse($startDate->format('Y-m-d') . ' ' . $request->start_time)
            : ($startDate->isToday() ? now() : null);
        if ($startAt && $startDate->isToday() && $startAt->lt(now())) $startAt = now();
        $duration = (int) round(((float) $request->hour) * 60);
        $anchor = $startAt ?: $startDate->copy();
        $laterTasks = $mode === 'keep'
            ? collect()
            : $this->getTasksWithSegmentsAfter((int) $task->user_id, $anchor, [(int) $task->id]);
        if ($request->exists('reflow_task_ids') && $mode !== 'keep') {
            $selectedTaskIds = array_map('intval', (array) $request->input('reflow_task_ids'));
            $laterTasks = $laterTasks->filter(fn ($laterTask) => in_array((int) $laterTask->id, $selectedTaskIds, true))->values();
        }
        $previousTaskSegments = [];
        foreach ($laterTasks as $laterTask) {
            $previousTaskSegments[$laterTask->id] = $laterTask->segments->map(fn ($segment) => [
                'segment_date' => $segment->segment_date->format('Y-m-d'),
                'start_time' => $segment->start_time,
                'end_time' => $segment->end_time,
                'allocated_minutes' => (int) $segment->allocated_minutes,
            ])->values()->all();
            $laterTask->segments()->delete();
        }

        if ($request->boolean('auto_schedule')) {
            $segments = $scheduler->allocate((int) $task->user_id, $startDate, $endDate, $duration, $setting, (int) $task->id, $startAt);
            $availabilityStart = $startAt;
            $availabilityEnd = null;
        } else {
            if (!$request->filled('start_time') || !$request->filled('end_time')) {
                return ['success' => false, 'message' => 'Choose both a start and end time for the manual schedule.'];
            }
            $manualStart = Carbon::parse($request->start_date . ' ' . $request->start_time);
            $manualEnd = Carbon::parse($request->end_date . ' ' . $request->end_time);
            $availabilityStart = $manualStart;
            $availabilityEnd = $manualEnd;
            $settingForManual = $setting ?: (object) [
                'working_days' => '1,2,3,4,5,6,7', 'start_work_time' => '00:00:00', 'end_work_time' => '23:59:59',
                'start_break_time' => null, 'end_break_time' => null, 'holidays' => collect(),
            ];
            $segments = $scheduler->allocateManual((int) $task->user_id, $manualStart, $manualEnd, $duration, $settingForManual, (int) $task->id);
        }
        if (!$segments) {
            $availability = $scheduler->availabilityReport((int) $task->user_id, $startDate, $endDate, $setting, (int) $task->id, $availabilityStart, $availabilityEnd);
            if ($mode !== 'keep') {
                $blockers = collect($availability['conflicts'])->map(fn ($item) => "#{$item['id']} {$item['task_name']}")->unique()->implode(', ');
                $blockedBy = $blockers ? " Remaining occupied periods: {$blockers}." : '';
                throw new \RuntimeException("After moving the selected tasks, only {$availability['available_minutes']} minutes are available; this task needs {$duration}. Extend its date range or choose another start time.{$blockedBy}");
            }
            return [
                'success' => false,
                'message' => "This task needs {$duration} minutes, but only {$availability['available_minutes']} minutes are free in the selected working periods. Move later tasks or extend the date range.",
                'required_minutes' => $duration,
                'available_minutes' => $availability['available_minutes'],
                'conflicts' => $availability['conflicts'],
            ];
        }

        $updatedTask = $this->saveTaskAndSegments($request, $segments, (int) $task->id);
        $moved = [];
        if ($laterTasks->isNotEmpty()) {
            $summary = $scheduler->summarize($segments);
            $reflowAnchor = $mode === 'forward' || $mode === 'manual'
                ? Carbon::parse($summary['end_date'] . ' ' . $summary['end_time'])
                : Carbon::parse($summary['start_date'] . ' ' . $summary['start_time']);
            $manualStarts = collect($request->input('reflow_task_schedules', []))->keyBy(fn ($item) => (int) $item['task_id'])->all();
            $needsBackwardAllocation = $mode === 'backfill' && $duration > array_sum(array_column($oldSegments, 'allocated_minutes'));
            $moved = $this->reflowTasks($laterTasks, $reflowAnchor, $setting, $manualStarts, $needsBackwardAllocation);
            foreach ($moved as &$item) $item['previous_segments'] = $previousTaskSegments[$item['id']] ?? [];
            unset($item);
        }

        return [
            'success' => true,
            'mode' => $mode,
            'original_segments' => $oldSegments,
            'segments' => $updatedTask->fresh()->segments->map(fn ($segment) => [
                'segment_date' => $segment->segment_date->format('Y-m-d'),
                'start_time' => $segment->start_time,
                'end_time' => $segment->end_time,
                'allocated_minutes' => (int) $segment->allocated_minutes,
            ])->values()->all(),
            'total_allocated_minutes' => $duration,
            'affected_tasks' => $moved,
        ];
    }

    /**
     * Soft delete a task. When reflow=1, later tasks are moved into the
     * earliest available time slots, in their existing chronological order.
     * The operation is atomic: if any task cannot fit, nothing is changed.
     */
    public function destroy(Request $request, $id)
    {
        try {
            return DB::transaction(function () use ($request, $id) {
                $initial = Task::whereKey($id)->first();
                if (!$initial) {
                    return response()->json(['success' => false, 'message' => 'Task not found.'], 404);
                }
                DB::table('users')->where('id', $initial->user_id)->lockForUpdate()->first();
                $task = Task::with('segments')->whereKey($id)->lockForUpdate()->first();
                if (!$task || (int) $task->user_id !== (int) $initial->user_id) {
                    return response()->json(['success' => false, 'message' => 'Task changed while deletion was starting. Please retry.'], 409);
                }

                $reflow = filter_var($request->query('reflow', false), FILTER_VALIDATE_BOOLEAN);
                if (!$reflow) {
                    $task->delete();
                    return response()->json(['success' => true, 'message' => 'Task has been deleted successfully.']);
                }
                $anchor = $this->taskScheduleAnchor($task);
                $laterTasks = $this->getLaterScheduledTasks((int) $task->user_id, $anchor, [(int) $task->id]);
                $setting = null;
                if ($laterTasks->isNotEmpty()) {
                    $setting = SlotSetting::with('holidays')->where('user_id', $task->user_id)->where('status', '1')->first();
                    $problem = $this->schedulingSettingsProblem($setting);
                    if ($problem) {
                        return response()->json(['success' => false, 'message' => $problem], 422);
                    }
                }

                $task->delete();
                $moved = $setting ? $this->reflowTasks($laterTasks, $anchor, $setting) : [];
                return response()->json(['success' => true, 'message' => 'Task deleted and following tasks rescheduled successfully.', 'rescheduled' => $moved]);
            });
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'No tasks were changed. ' . $e->getMessage()], 422);
        }
    }

    public function multidelete(Request $request)
    {
        $ids = $this->normalizeTaskIds($request->input('id'));
        if (!$ids) {
            return response()->json(['success' => false, 'message' => 'Select at least one task.'], 400);
        }

        try {
            return DB::transaction(function () use ($ids, $request) {
                $userIds = Task::whereIn('id', $ids)->whereNull('deleted_at')->pluck('user_id')->unique()->sort()->values();
                foreach ($userIds as $userId) {
                    DB::table('users')->where('id', $userId)->lockForUpdate()->first();
                }
                $tasks = Task::with('segments')->whereIn('id', $ids)->whereNull('deleted_at')->orderBy('user_id')->orderBy('id')->lockForUpdate()->get();
                if ($tasks->count() !== count($ids)) {
                    return response()->json(['success' => false, 'message' => 'One or more selected tasks are no longer active. Refresh the list and try again.'], 409);
                }

                $reflow = $request->boolean('reflow');
                if (!$reflow) {
                    foreach ($tasks as $task) $task->delete();
                    return response()->json(['success' => true, 'message' => 'Selected tasks were moved to the recycle bin.']);
                }

                $moved = [];
                foreach ($tasks->groupBy('user_id') as $userId => $userTasks) {
                    $anchors = $userTasks->map(fn ($task) => $this->taskScheduleAnchor($task));
                    $anchor = $anchors->sortBy(fn ($date) => $date->timestamp)->first();
                    $selectedIds = $userTasks->pluck('id')->map(fn ($taskId) => (int) $taskId)->all();
                    $laterTasks = $this->getLaterScheduledTasks((int) $userId, $anchor, $selectedIds);
                    $setting = null;
                    if ($laterTasks->isNotEmpty()) {
                        $setting = SlotSetting::with('holidays')->where('user_id', $userId)->where('status', '1')->first();
                        $problem = $this->schedulingSettingsProblem($setting);
                        if ($problem) throw new \RuntimeException($problem);
                    }
                    foreach ($userTasks as $task) $task->delete();
                    if ($setting) $moved = array_merge($moved, $this->reflowTasks($laterTasks, $anchor, $setting));
                }

                return response()->json(['success' => true, 'message' => 'Selected tasks were deleted and following tasks were rescheduled.', 'rescheduled' => $moved]);
            });
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Bulk deletion was rolled back. ' . $e->getMessage()], 422);
        }
    }

    private function normalizeTaskIds($ids): array
    {
        $values = is_string($ids) ? explode(',', $ids) : (array) $ids;
        return array_values(array_unique(array_filter(array_map('intval', $values), fn ($id) => $id > 0)));
    }

    private function taskScheduleAnchor(Task $task): Carbon
    {
        $first = $task->segments->sortBy(fn ($segment) => $segment->segment_date->format('Y-m-d') . ' ' . $segment->start_time)->first();
        if ($first) {
            return Carbon::parse($first->segment_date->format('Y-m-d') . ' ' . $first->start_time);
        }
        return Carbon::parse(($task->start_date ?: now()->format('Y-m-d')) . ' ' . ($task->start_time ?: '00:00:00'));
    }

    private function taskDurationMinutes(Task $task): int
    {
        $allocated = (int) $task->segments->sum('allocated_minutes');
        return $allocated > 0 ? $allocated : (int) round(((float) $task->hour) * 60);
    }

    private function taskAllocationLimit(Task $task, Carbon $anchor): Carbon
    {
        return $task->end_date
            ? Carbon::parse($task->end_date)->startOfDay()
            : $anchor->copy()->addYears(10)->startOfDay();
    }

    private function validateRestorePlan($segments, int $userId, int $taskId, int $duration, Carbon $anchor, Carbon $limit, $setting, \App\Services\TaskSchedulingService $scheduler): ?array
    {
        if (!is_array($segments) || !$segments) return null;

        try {
            $normalized = [];
            foreach ($segments as $segment) {
                if (!is_array($segment) || empty($segment['segment_date']) || empty($segment['start_time']) || empty($segment['end_time'])) return null;
                $date = Carbon::parse($segment['segment_date'])->startOfDay();
                $start = Carbon::parse($segment['segment_date'] . ' ' . $segment['start_time']);
                $end = Carbon::parse($segment['segment_date'] . ' ' . $segment['end_time']);
                $minutes = (int) ($segment['allocated_minutes'] ?? 0);
                if ($date->lt($anchor->copy()->startOfDay()) || $date->gt($limit->copy()->startOfDay()) || !$start->lt($end) || $minutes <= 0) return null;
                if ($date->isSameDay($anchor) && $start->lt($anchor)) return null;
                $normalized[] = [
                    'segment_date' => $date->format('Y-m-d'),
                    'start_time' => $start->format('H:i:s'),
                    'end_time' => $end->format('H:i:s'),
                    'allocated_minutes' => $minutes,
                ];
            }

            usort($normalized, fn ($left, $right) => [$left['segment_date'], $left['start_time']] <=> [$right['segment_date'], $right['start_time']]);
            $dailySequence = [];
            foreach ($normalized as &$segment) {
                $dailySequence[$segment['segment_date']] = ($dailySequence[$segment['segment_date']] ?? 0) + 1;
                $segment['sequence'] = $dailySequence[$segment['segment_date']];
            }
            unset($segment);

            if (array_sum(array_column($normalized, 'allocated_minutes')) !== $duration || $scheduler->hasInternalOverlap($normalized)) return null;
            if ($this->segmentsSchedulingProblem($normalized, $setting) || $scheduler->hasOverlap($userId, $normalized, $taskId)) return null;
            return $normalized;
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function schedulingSettingsProblem($setting): ?string
    {
        if (!$setting) return 'Active working-time settings are required to reschedule these tasks.';
        if (empty($setting->working_days) || empty($setting->start_work_time) || empty($setting->end_work_time)) {
            return 'Complete working days and hours before rescheduling these tasks.';
        }
        $break = $this->getValidatedBreakSetting($setting);
        if ($break['invalid']) return $break['message'];
        try {
            $workStart = Carbon::parse($setting->start_work_time);
            $workEnd = Carbon::parse($setting->end_work_time);
        } catch (\Throwable $e) {
            return 'Working-hour settings contain invalid times.';
        }
        if (!$workStart->lt($workEnd) || ($break['has_break'] && (
            $break['start']->format('H:i:s') < $workStart->format('H:i:s') ||
            $break['end']->format('H:i:s') > $workEnd->format('H:i:s')
        ))) return 'Working hours or break times are invalid.';
        return null;
    }

    private function segmentsSchedulingProblem(array $segments, $setting): ?string
    {
        if (!$setting) return null;
        $problem = $this->schedulingSettingsProblem($setting);
        if ($problem) return $problem;
        $workingDays = collect(explode(',', (string) $setting->working_days))->map(fn ($day) => (int) trim($day))->filter(fn ($day) => $day >= 1 && $day <= 7)->all();
        $holidays = $setting->holidays->pluck('holiday_date')->map(fn ($date) => Carbon::parse($date)->format('Y-m-d'))->all();
        $workStart = Carbon::parse($setting->start_work_time)->format('H:i:s');
        $workEnd = Carbon::parse($setting->end_work_time)->format('H:i:s');
        $break = $this->getValidatedBreakSetting($setting);
        foreach ($segments as $segment) {
            $date = Carbon::parse($segment['segment_date']);
            $startTime = Carbon::parse($segment['start_time'])->format('H:i:s');
            $endTime = Carbon::parse($segment['end_time'])->format('H:i:s');
            if ($startTime >= $endTime) return 'An original segment has an invalid time range.';
            if (!in_array($date->dayOfWeekIso, $workingDays, true) || in_array($date->format('Y-m-d'), $holidays, true)) {
                return 'An original segment falls on a non-working day or holiday.';
            }
            if ($startTime < $workStart || $endTime > $workEnd) return 'An original segment falls outside configured working hours.';
            if ($break['has_break'] && $startTime < $break['end']->format('H:i:s') && $endTime > $break['start']->format('H:i:s')) {
                return 'An original segment overlaps the configured break.';
            }
            $minutes = (int) Carbon::parse($date->format('Y-m-d') . ' ' . $startTime)->diffInMinutes(Carbon::parse($date->format('Y-m-d') . ' ' . $endTime));
            if ($minutes !== (int) $segment['allocated_minutes']) return 'An original segment duration does not match its stored interval.';
        }
        return null;
    }

    private function originalRestoreProblem(Task $task, array $segments, $setting, \App\Services\TaskSchedulingService $scheduler): ?string
    {
        if (!$segments) return 'No saved schedule segments were found for this task.';

        $problem = $this->segmentsSchedulingProblem($segments, $setting);
        if ($problem) return $problem;
        if ($scheduler->hasInternalOverlap($segments)) return 'The saved segments overlap each other.';

        $conflicts = [];
        foreach ($segments as $segment) {
            $occupants = DB::table('task_segments')
                ->join('task', 'task.id', '=', 'task_segments.task_id')
                ->where('task.user_id', $task->user_id)
                ->whereNull('task.deleted_at')
                ->whereDate('task_segments.segment_date', $segment['segment_date'])
                ->where('task_segments.start_time', '<', $segment['end_time'])
                ->where('task_segments.end_time', '>', $segment['start_time'])
                ->select(['task.id', 'task.task_name', 'task_segments.segment_date', 'task_segments.start_time', 'task_segments.end_time'])
                ->get();

            foreach ($occupants as $occupant) {
                $date = Carbon::parse($occupant->segment_date)->format('M j, Y');
                $busyStart = Carbon::parse($occupant->start_time)->format('g:i A');
                $busyEnd = Carbon::parse($occupant->end_time)->format('g:i A');
                $taskName = trim((string) $occupant->task_name);
                $label = $taskName !== '' ? " '{$taskName}'" : '';
                $conflicts[] = "Task #{$occupant->id}{$label} is scheduled on {$date} from {$busyStart} to {$busyEnd}.";
            }
        }

        if ($conflicts) {
            return 'An active task already occupies part of this saved time: ' . implode(' ', array_values(array_unique($conflicts)));
        }
        return null;
    }

    private function restoreReflowCandidates(Task $restoreTask, array $originalSegments, array $excludedTaskIds = [])
    {
        $anchor = $this->taskScheduleAnchor($restoreTask);
        return Task::with('segments')->where('user_id', $restoreTask->user_id)
            ->whereNull('deleted_at')->whereNotIn('id', array_merge([$restoreTask->id], $excludedTaskIds))
            ->orderBy('id')->lockForUpdate()->get()
            ->filter(function ($candidate) use ($anchor, $originalSegments) {
                if ($candidate->segments->isEmpty()) return false;
                if ($this->taskScheduleAnchor($candidate)->gte($anchor)) return true;
                foreach ($candidate->segments as $segment) {
                    foreach ($originalSegments as $original) {
                        if ($segment->segment_date->format('Y-m-d') === Carbon::parse($original['segment_date'])->format('Y-m-d')
                            && $segment->start_time < $original['end_time'] && $segment->end_time > $original['start_time']) {
                            return true;
                        }
                    }
                }
                return false;
            })
            ->sortBy(fn ($candidate) => $this->taskScheduleAnchor($candidate)->format('Y-m-d H:i:s') . '|' . str_pad((string) $candidate->id, 12, '0', STR_PAD_LEFT))
            ->values();
    }

    /** Reflow conflicting and later tasks while the restored task's original segments reserve their time. */
    private function reflowForOriginalRestore(Task $restoreTask, array $originalSegments, $setting, array $excludedTaskIds = []): array
    {
        $tasks = $this->restoreReflowCandidates($restoreTask, $originalSegments, $excludedTaskIds);
        if ($tasks->isEmpty()) return [];

        $anchor = $this->taskScheduleAnchor($restoreTask);
        $scheduler = new \App\Services\TaskSchedulingService();
        $plans = [];
        foreach ($tasks as $task) {
            $duration = $this->taskDurationMinutes($task);
            if ($duration <= 0) throw new \RuntimeException("Task '{$task->task_name}' (#{$task->id}) has no valid stored duration.");
            $plans[$task->id] = ['duration' => $duration, 'deadline' => $this->taskAllocationLimit($task, $anchor)];
            $task->segments()->delete();
        }

        $moved = [];
        foreach ($tasks as $task) {
            $plan = $plans[$task->id];
            $segments = $scheduler->allocate((int) $task->user_id, $anchor->copy()->startOfDay(), $plan['deadline'], $plan['duration'], $setting, (int) $task->id, $anchor);
            if (!$segments) {
                throw new \RuntimeException("Task '{$task->task_name}' (#{$task->id}) cannot fit its full {$plan['duration']}-minute duration by {$plan['deadline']->format('M j, Y')}. No task schedules were changed.");
            }
            $summary = $scheduler->summarize($segments);
            $task->fill([
                'start_date' => $summary['start_date'], 'start_time' => $summary['start_time'],
                'end_date' => $summary['end_date'], 'end_time' => $summary['end_time'],
                'hour' => $summary['total_minutes'] / 60,
            ])->save();
            $scheduler->writeSegments($task, $segments);
            $moved[] = ['id' => $task->id, 'task_name' => $task->task_name, 'segments' => $segments, 'total_allocated_minutes' => $plan['duration']];
        }
        return $moved;
    }

    /** Build a safe preview by applying the proposed reflow inside a transaction, then always rolling it back. */
    private function previewOriginalRestoreReflow(int $taskId): array
    {
        $db = DB::connection();
        $db->beginTransaction();
        try {
            $initial = Task::onlyTrashed()->whereKey($taskId)->first();
            if (!$initial) return ['tasks' => null, 'message' => 'This deleted task is no longer available. Refresh the recycle bin.'];
            DB::table('users')->where('id', $initial->user_id)->lockForUpdate()->first();
            $task = Task::onlyTrashed()->with('segments')->whereKey($taskId)->lockForUpdate()->first();
            if (!$task) return ['tasks' => null, 'message' => 'This deleted task is no longer available. Refresh the recycle bin.'];
            $segments = $task?->segments->map(fn ($segment) => $segment->toArray())->all() ?? [];
            $scheduler = new \App\Services\TaskSchedulingService();
            $setting = SlotSetting::with('holidays')->where('user_id', $task->user_id)->where('status', '1')->first();
            $settingsProblem = $this->schedulingSettingsProblem($setting);
            if ($settingsProblem) return ['tasks' => null, 'message' => $settingsProblem];
            $segmentProblem = $this->segmentsSchedulingProblem($segments, $setting);
            if ($segmentProblem) return ['tasks' => null, 'message' => "The saved times do not fit current working settings: {$segmentProblem}"];
            if ($scheduler->hasInternalOverlap($segments)) return ['tasks' => null, 'message' => 'The saved segments overlap each other, so they cannot be restored as saved.'];
            $liveProblem = $this->originalRestoreProblem($task, $segments, $setting, $scheduler);
            if (!$liveProblem || !str_starts_with($liveProblem, 'An active task already occupies')) {
                return ['tasks' => null, 'message' => 'The schedule changed while this preview was being prepared. Refresh the preview and try again.'];
            }

            $task->restore();
            $moved = $this->reflowForOriginalRestore($task, $segments, $setting);
            return ['tasks' => $moved, 'message' => null];
        } catch (\Throwable $e) {
            return ['tasks' => null, 'message' => $e->getMessage()];
        } finally {
            if ($db->transactionLevel() > 0) $db->rollBack();
        }
    }

    private function getLaterScheduledTasks(int $userId, Carbon $anchor, array $excludedIds)
    {
        return Task::with('segments')->where('user_id', $userId)->whereNull('deleted_at')
            ->whereNotIn('id', $excludedIds)->orderBy('id')->lockForUpdate()->get()
            ->filter(fn ($task) => $task->segments->isNotEmpty() && $this->taskScheduleAnchor($task)->gt($anchor))
            ->sortBy(fn ($task) => $this->taskScheduleAnchor($task)->format('Y-m-d H:i:s') . '|' . str_pad((string) $task->id, 12, '0', STR_PAD_LEFT))
            ->values();
    }

    /** Select tasks by segment-level position, including multi-day tasks whose first segment is earlier. */
    private function getTasksWithSegmentsAfter(int $userId, Carbon $anchor, array $excludedIds)
    {
        $date = $anchor->format('Y-m-d');
        $time = $anchor->format('H:i:s');
        return Task::with('segments')->where('user_id', $userId)->whereNull('deleted_at')
            ->whereNotIn('id', $excludedIds)
            ->whereHas('segments', fn ($query) => $query->whereDate('segment_date', '>', $date)
                ->orWhere(fn ($sameDay) => $sameDay->whereDate('segment_date', $date)->where('end_time', '>', $time)))
            ->orderBy('id')->lockForUpdate()->get()
            ->sortBy(fn ($task) => $this->taskScheduleAnchor($task)->format('Y-m-d H:i:s') . '|' . str_pad((string) $task->id, 12, '0', STR_PAD_LEFT))
            ->values();
    }

    private function reflowTasks($tasks, Carbon $anchor, $setting, array $manualStarts = [], bool $backward = false): array
    {
        if ($tasks->isEmpty()) return [];
        $scheduler = new \App\Services\TaskSchedulingService();
        $plans = [];
        foreach ($tasks as $order => $task) {
            $duration = $this->taskDurationMinutes($task);
            if ($duration <= 0) {
                throw new \RuntimeException("Task '{$task->task_name}' (#{$task->id}) has no valid allocated duration.");
            }
            $plans[$task->id] = [
                'duration' => $duration,
                'deadline' => $this->taskAllocationLimit($task, $anchor),
                'previous_segments' => $task->segments->map(fn ($segment) => $segment->toArray())->all(),
                'order' => $order,
            ];
            $task->segments()->delete();
        }

        $moved = [];
        $processingTasks = $backward ? $tasks->reverse() : $tasks;
        foreach ($processingTasks as $task) {
            $plan = $plans[$task->id];
            if (isset($manualStarts[$task->id])) {
                $preferred = $manualStarts[$task->id];
                $taskStart = Carbon::parse($preferred['start_date'] . ' ' . $preferred['start_time']);
                $earliestAllowed = $task->start_date
                    ? Carbon::parse($task->start_date)->startOfDay()
                    : Carbon::today();
                if ($earliestAllowed->lt(Carbon::today())) {
                    $earliestAllowed = Carbon::today();
                }
                if ($taskStart->lt(Carbon::now())) {
                    throw new \RuntimeException("Task '{$task->task_name}' (#{$task->id}) cannot be manually moved into the past.");
                }
                if ($taskStart->copy()->startOfDay()->lt($earliestAllowed) || $taskStart->copy()->startOfDay()->gt($plan['deadline'])) {
                    throw new \RuntimeException("Task '{$task->task_name}' (#{$task->id}) must stay between its allowed dates ({$earliestAllowed->format('Y-m-d')} and {$plan['deadline']->format('Y-m-d')}).");
                }
                $segments = $scheduler->allocate((int) $task->user_id, $taskStart->copy()->startOfDay(), $plan['deadline'], $plan['duration'], $setting, (int) $task->id, $taskStart);
            } elseif ($backward) {
                // A backward move may use earlier working time, but must stay inside
                // the task's original date range (and never schedule before today).
                $earliestDate = $task->start_date
                    ? Carbon::parse($task->start_date)->startOfDay()
                    : Carbon::today();
                if ($earliestDate->lt(Carbon::today())) {
                    $earliestDate = Carbon::today();
                }
                $segments = $scheduler->allocateBackward((int) $task->user_id, $earliestDate, $anchor, $plan['duration'], $setting, (int) $task->id, Carbon::now());
            } else {
                $segments = $scheduler->allocate((int) $task->user_id, $anchor->copy()->startOfDay(), $plan['deadline'], $plan['duration'], $setting, (int) $task->id, $anchor);
            }
            if (!$segments) {
                $limit = $task->end_date ? " by its end-date limit ({$task->end_date})" : ' within the available working periods';
                throw new \RuntimeException("Task '{$task->task_name}' (#{$task->id}) could not fit {$plan['duration']} minutes{$limit}.");
            }
            $summary = $scheduler->summarize($segments);
            $task->fill([
                'start_date' => $summary['start_date'], 'start_time' => $summary['start_time'],
                'end_date' => $summary['end_date'], 'end_time' => $summary['end_time'],
                'hour' => $summary['total_minutes'] / 60,
            ])->save();
            $scheduler->writeSegments($task, $segments);
            $moved[] = [
                'id' => $task->id,
                'task_name' => $task->task_name,
                'previous_segments' => $plan['previous_segments'],
                'segments' => $segments,
                'total_allocated_minutes' => $plan['duration'],
                '_order' => $plan['order'],
            ];
        }
        if ($backward) {
            usort($moved, fn ($left, $right) => $left['_order'] <=> $right['_order']);
            foreach ($moved as &$item) unset($item['_order']);
            unset($item);
        }
        return $moved;
    }

    public function getDeletedData(Request $request) {
        $data = Task::onlyTrashed()->with('segments')->where('user_id', $request->id)->get();
        $data->each(fn ($task) => $task->setAttribute('total_allocated_minutes', (int) $task->segments->sum('allocated_minutes')));

        return response()->json([
            'data' => $data,
        ]);
    }

    public function previewRestore(Request $request, $id)
    {
        $task = Task::onlyTrashed()->with('segments')->whereKey($id)->first();
        if (!$task) return response()->json(['success' => false, 'message' => 'Deleted task not found.'], 404);

        $scheduler = new \App\Services\TaskSchedulingService();
        $original = $task->segments->map(fn ($segment) => $segment->toArray())->all();
        $duration = $this->taskDurationMinutes($task);
        $anchor = $this->taskScheduleAnchor($task);
        $originalSetting = SlotSetting::with('holidays')->where('user_id', $task->user_id)->first();
        $originalProblem = $this->originalRestoreProblem($task, $original, $originalSetting, $scheduler);
        $originalAvailable = $originalProblem === null;
        $restoreWithReflow = ['tasks' => null, 'message' => 'The original time is not blocked by an active task.'];
        if ($originalProblem && str_starts_with($originalProblem, 'An active task already occupies')) {
            $restoreWithReflow = $this->previewOriginalRestoreReflow((int) $task->id);
        }
        $setting = SlotSetting::with('holidays')->where('user_id', $task->user_id)->where('status', '1')->first();
        $settingProblem = $this->schedulingSettingsProblem($setting);
        $proposed = null;
        $extendedProposed = null;
        $rescheduleMessage = $settingProblem;
        if ($duration <= 0) {
            $rescheduleMessage = 'This task has no valid stored duration.';
        } elseif (!$settingProblem) {
            $proposed = $scheduler->allocate((int) $task->user_id, $anchor->copy()->startOfDay(), $this->taskAllocationLimit($task, $anchor), $duration, $setting, (int) $task->id, $anchor);
            if ($proposed) $rescheduleMessage = null;
            else $rescheduleMessage = 'The full task duration cannot fit before its end-date limit.';
            if (!$proposed && $task->end_date) {
                $extendedProposed = $scheduler->allocate((int) $task->user_id, $anchor->copy()->startOfDay(), $anchor->copy()->addYears(10)->startOfDay(), $duration, $setting, (int) $task->id, $anchor);
            }
        }

        return response()->json([
            'success' => true,
            'task' => ['id' => $task->id, 'task_name' => $task->task_name, 'start_date' => $task->start_date, 'end_date' => $task->end_date],
            'duration_minutes' => $duration,
            'original_segments' => $original,
            'can_restore_original' => $originalAvailable,
            'original_conflict' => $originalProblem,
            'can_restore_original_by_moving_tasks' => $restoreWithReflow['tasks'] !== null,
            'original_reflow_tasks' => $restoreWithReflow['tasks'],
            'original_reflow_message' => $restoreWithReflow['message'],
            'rescheduled_segments' => $proposed,
            'reschedule_message' => $rescheduleMessage,
            'extended_rescheduled_segments' => $extendedProposed,
            'extended_end_date' => $extendedProposed ? $scheduler->summarize($extendedProposed)['end_date'] : null,
        ]);
    }

    public function restoreData(Request $request, $id)
    {
        try {
            return DB::transaction(function () use ($request, $id) {
                $initial = Task::onlyTrashed()->whereKey($id)->first();
                if (!$initial) return response()->json(['success' => false, 'message' => 'Deleted task not found.'], 404);
                DB::table('users')->where('id', $initial->user_id)->lockForUpdate()->first();
                $task = Task::onlyTrashed()->with('segments')->whereKey($id)->lockForUpdate()->first();
                if (!$task || (int) $task->user_id !== (int) $initial->user_id) {
                    return response()->json(['success' => false, 'message' => 'Task changed while restore was starting. Please retry.'], 409);
                }

                $mode = $request->input('mode', 'original');
                if (!in_array($mode, ['original', 'original_reflow', 'reschedule', 'reschedule_extend'], true)) {
                    return response()->json(['success' => false, 'message' => 'Choose a valid restore option.'], 422);
                }
                $scheduler = new \App\Services\TaskSchedulingService();
                $segments = $task->segments->map(fn ($segment) => $segment->toArray())->all();
                if ($mode === 'original') {
                    $originalSetting = SlotSetting::with('holidays')->where('user_id', $task->user_id)->first();
                    $problem = $this->originalRestoreProblem($task, $segments, $originalSetting, $scheduler);
                    if ($problem) {
                        return response()->json(['success' => false, 'message' => "Cannot restore to the saved times. {$problem} No changes were made. Review the preview and choose Restore & Reschedule if you want to use the proposed times."], 422);
                    }
                    $task->restore();
                    return response()->json(['success' => true, 'message' => 'Task restored to its original schedule.', 'segments' => $segments]);
                }

                if ($mode === 'original_reflow') {
                    $setting = SlotSetting::with('holidays')->where('user_id', $task->user_id)->where('status', '1')->first();
                    $settingProblem = $this->schedulingSettingsProblem($setting);
                    if ($settingProblem) return response()->json(['success' => false, 'message' => "Cannot move the blocking tasks: {$settingProblem} The deleted task remains in the recycle bin."], 422);
                    $problem = $this->segmentsSchedulingProblem($segments, $setting);
                    if ($problem) return response()->json(['success' => false, 'message' => "The saved times do not fit current working settings: {$problem} The deleted task remains in the recycle bin."], 422);
                    if (!$segments || $scheduler->hasInternalOverlap($segments)) return response()->json(['success' => false, 'message' => 'The saved segments are missing or overlap each other. The deleted task remains in the recycle bin.'], 422);

                    $liveProblem = $this->originalRestoreProblem($task, $segments, $setting, $scheduler);
                    if (!$liveProblem) {
                        $task->restore();
                        return response()->json(['success' => true, 'message' => 'The original time became available. Task restored without moving any other tasks.', 'segments' => $segments, 'rescheduled_tasks' => []]);
                    }
                    if (!str_starts_with($liveProblem, 'An active task already occupies')) {
                        return response()->json(['success' => false, 'message' => "The saved times cannot currently be restored. {$liveProblem} No changes were made."], 422);
                    }

                    $task->restore();
                    $moved = $this->reflowForOriginalRestore($task, $segments, $setting);
                    return response()->json([
                        'success' => true,
                        'message' => $moved
                            ? 'Task restored to its original times. The overlapping and later tasks were moved to available times.'
                            : 'Task restored to its original times. No other tasks needed to move.',
                        'segments' => $segments,
                        'rescheduled_tasks' => $moved,
                    ]);
                }

                $setting = SlotSetting::with('holidays')->where('user_id', $task->user_id)->where('status', '1')->first();
                $problem = $this->schedulingSettingsProblem($setting);
                if ($problem) return response()->json(['success' => false, 'message' => $problem . ' The task remains in the recycle bin.'], 422);
                $duration = $this->taskDurationMinutes($task);
                if ($duration <= 0) return response()->json(['success' => false, 'message' => 'This task has no valid stored duration and remains in the recycle bin.'], 422);
                if ($mode === 'reschedule_extend' && !$task->end_date) {
                    return response()->json(['success' => false, 'message' => 'This task has no end-date limit to extend. It remains in the recycle bin.'], 422);
                }
                $anchor = $this->taskScheduleAnchor($task);
                $allocationLimit = $mode === 'reschedule_extend'
                    ? $anchor->copy()->addYears(10)->startOfDay()
                    : $this->taskAllocationLimit($task, $anchor);
                $newSegments = $this->validateRestorePlan(
                    $request->input('segments'), (int) $task->user_id, (int) $task->id,
                    $duration, $anchor, $allocationLimit, $setting, $scheduler
                ) ?? $scheduler->allocate((int) $task->user_id, $anchor->copy()->startOfDay(), $allocationLimit, $duration, $setting, (int) $task->id, $anchor);
                if (!$newSegments) return response()->json(['success' => false, 'message' => "The full {$duration}-minute task cannot fit within available working time. It remains in the recycle bin."], 422);

                $summary = $scheduler->summarize($newSegments);
                $task->segments()->delete();
                $task->fill([
                    'start_date' => $summary['start_date'], 'start_time' => $summary['start_time'],
                    'end_date' => $summary['end_date'], 'end_time' => $summary['end_time'],
                    'hour' => $summary['total_minutes'] / 60,
                ])->save();
                $task->restore();
                $scheduler->writeSegments($task, $newSegments);
                return response()->json([
                    'success' => true,
                    'message' => $mode === 'reschedule_extend'
                        ? "Task restored at available times. Its end date was extended to {$summary['end_date']}."
                        : 'Task restored and rescheduled.',
                    'segments' => $newSegments,
                    'end_date' => $summary['end_date'],
                ]);
            });
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Restore was rolled back. ' . $e->getMessage()], 422);
        }
    }

    public function restoreMultiData(Request $request)
    {
        $ids = $this->normalizeTaskIds($request->input('id'));
        if (!$ids) {
            return response()->json(['success' => false, 'message' => 'No tasks selected.'], 400);
        }

        try {
            return DB::transaction(function () use ($ids, $request) {
                $userIds = Task::onlyTrashed()->whereIn('id', $ids)->pluck('user_id')->unique()->sort();
                foreach ($userIds as $userId) DB::table('users')->where('id', $userId)->lockForUpdate()->first();
                $tasks = Task::onlyTrashed()->with('segments')->whereIn('id', $ids)->orderBy('user_id')->orderBy('id')->lockForUpdate()->get();
                if ($tasks->count() !== count($ids)) {
                    return response()->json(['success' => false, 'message' => 'One or more selected deleted tasks could not be found.'], 409);
                }

                $modes = $request->input('modes', []);
                $defaultMode = $request->input('mode', 'original');
                $validModes = ['original', 'original_reflow', 'reschedule', 'reschedule_extend'];
                if (!is_array($modes) || !in_array($defaultMode, $validModes, true)) {
                    return response()->json(['success' => false, 'message' => 'Choose original or reschedule restore mode.'], 422);
                }
                $scheduler = new \App\Services\TaskSchedulingService();
                $selectedSegments = [];
                $restoreModes = [];
                foreach ($tasks as $task) {
                    $mode = $modes[(string) $task->id] ?? $defaultMode;
                    if (!in_array($mode, $validModes, true)) {
                        return response()->json(['success' => false, 'message' => "Invalid restore choice for task {$task->id}."], 422);
                    }
                    if ($mode === 'reschedule_extend' && !$task->end_date) {
                        return response()->json(['success' => false, 'message' => "Task #{$task->id} has no end-date limit to extend."], 422);
                    }
                    $restoreModes[$task->id] = $mode;
                    if ($mode === 'original' || $mode === 'original_reflow') {
                        $segments = $task->segments->map(fn ($segment) => $segment->toArray())->all();
                        $originalSetting = SlotSetting::with('holidays')->where('user_id', $task->user_id)->first();
                        $problem = $mode === 'original'
                            ? $this->originalRestoreProblem($task, $segments, $originalSetting, $scheduler)
                            : ($this->segmentsSchedulingProblem($segments, $originalSetting) ?: (!$segments ? 'No saved schedule segments were found.' : ($scheduler->hasInternalOverlap($segments) ? 'The saved segments overlap each other.' : null)));
                        if ($problem) {
                            return response()->json(['success' => false, 'message' => "Task #{$task->id} cannot be restored to its saved times. {$problem} No tasks were restored."], 422);
                        }
                        foreach ($segments as $segment) {
                            $key = $task->user_id . '|' . $segment['segment_date'];
                            foreach ($selectedSegments[$key] ?? [] as $other) {
                                if ($segment['start_time'] < $other['end_time'] && $segment['end_time'] > $other['start_time']) {
                                    return response()->json(['success' => false, 'message' => 'Selected tasks contain overlapping segments and cannot be restored together.'], 422);
                                }
                            }
                            $selectedSegments[$key][] = $segment;
                        }
                    }
                }

                $restored = [];
                foreach ($tasks->groupBy('user_id') as $userId => $userTasks) {
                    $userTasks = $userTasks->sortBy(fn ($task) => $this->taskScheduleAnchor($task)->format('Y-m-d H:i:s') . '|' . str_pad((string) $task->id, 12, '0', STR_PAD_LEFT))->values();
                    foreach ($userTasks as $task) {
                        if ($restoreModes[$task->id] === 'original') {
                            $task->restore();
                            $restored[] = ['id' => $task->id, 'mode' => 'original', 'segments' => $task->segments->map(fn ($segment) => $segment->toArray())->all()];
                            continue;
                        }
                        if ($restoreModes[$task->id] === 'original_reflow') {
                            $setting = SlotSetting::with('holidays')->where('user_id', $userId)->where('status', '1')->first();
                            $problem = $this->schedulingSettingsProblem($setting);
                            if ($problem) throw new \RuntimeException("Task #{$task->id}: {$problem}");
                            $segments = $task->segments->map(fn ($segment) => $segment->toArray())->all();
                            $problem = $this->segmentsSchedulingProblem($segments, $setting);
                            if ($problem) throw new \RuntimeException("Task #{$task->id} saved times no longer fit current settings: {$problem}");
                            if (!$segments || $scheduler->hasInternalOverlap($segments)) throw new \RuntimeException("Task #{$task->id} has missing or overlapping saved segments.");
                            $liveProblem = $this->originalRestoreProblem($task, $segments, $setting, $scheduler);
                            if (!$liveProblem) {
                                $task->restore();
                                $restored[] = ['id' => $task->id, 'mode' => 'original', 'segments' => $segments, 'rescheduled_tasks' => []];
                                continue;
                            }
                            if (!str_starts_with($liveProblem, 'An active task already occupies')) {
                                throw new \RuntimeException("Task #{$task->id} cannot be restored: {$liveProblem}");
                            }
                            $task->restore();
                            $moved = $this->reflowForOriginalRestore($task, $segments, $setting, $ids);
                            $restored[] = ['id' => $task->id, 'mode' => 'original_reflow', 'segments' => $segments, 'rescheduled_tasks' => $moved];
                            continue;
                        }
                        $setting = SlotSetting::with('holidays')->where('user_id', $userId)->where('status', '1')->first();
                        $problem = $this->schedulingSettingsProblem($setting);
                        if ($problem) throw new \RuntimeException($problem . ' Selected tasks remain in the recycle bin.');
                        $duration = $this->taskDurationMinutes($task);
                        $anchor = $this->taskScheduleAnchor($task);
                        $allocationLimit = $restoreModes[$task->id] === 'reschedule_extend'
                            ? $anchor->copy()->addYears(10)->startOfDay()
                            : $this->taskAllocationLimit($task, $anchor);
                        $segments = $duration > 0
                            ? $scheduler->allocate((int) $userId, $anchor->copy()->startOfDay(), $allocationLimit, $duration, $setting, (int) $task->id, $anchor)
                            : null;
                        if (!$segments) throw new \RuntimeException("Task '{$task->task_name}' (#{$task->id}) could not fit its full duration within its end-date limit.");
                        $summary = $scheduler->summarize($segments);
                        $task->segments()->delete();
                        $task->fill([
                            'start_date' => $summary['start_date'], 'start_time' => $summary['start_time'],
                            'end_date' => $summary['end_date'], 'end_time' => $summary['end_time'],
                            'hour' => $summary['total_minutes'] / 60,
                        ])->save();
                        $task->restore();
                        $scheduler->writeSegments($task, $segments);
                        $restored[] = ['id' => $task->id, 'mode' => $restoreModes[$task->id], 'segments' => $segments, 'total_allocated_minutes' => $duration, 'end_date' => $summary['end_date']];
                    }
                }
                return response()->json(['success' => true, 'message' => 'Selected tasks restored successfully.', 'restored' => $restored]);
            });
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Bulk restore was rolled back. ' . $e->getMessage()], 422);
        }
    }

    public function taskDeletePermanant($id) {
        try {
            return DB::transaction(function () use ($id) {
                $initial = Task::onlyTrashed()->whereKey($id)->first();
                if (!$initial) return response()->json(['success' => false, 'message' => 'Deleted task not found.'], 404);
                DB::table('users')->where('id', $initial->user_id)->lockForUpdate()->first();
                $task = Task::onlyTrashed()->whereKey($id)->lockForUpdate()->first();
                if (!$task) return response()->json(['success' => false, 'message' => 'Deleted task not found.'], 404);
                $task->forceDelete(); // task_segments are removed by the FK cascade.
                return response()->json(['success' => true, 'message' => 'Task and its scheduled segments were permanently deleted.']);
            });
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Permanent deletion failed. ' . $e->getMessage()], 422);
        }
    }

    public function taskMultiDeletePermanant(Request $request) {
        $ids = $this->normalizeTaskIds($request->input('id'));
        if (!$ids) return response()->json(['success' => false, 'message' => 'Select at least one deleted task.'], 400);
        try {
            return DB::transaction(function () use ($ids) {
                $userIds = Task::onlyTrashed()->whereIn('id', $ids)->pluck('user_id')->unique()->sort();
                foreach ($userIds as $userId) DB::table('users')->where('id', $userId)->lockForUpdate()->first();
                $tasks = Task::onlyTrashed()->whereIn('id', $ids)->orderBy('user_id')->orderBy('id')->lockForUpdate()->get();
                if ($tasks->count() !== count($ids)) return response()->json(['success' => false, 'message' => 'One or more selected deleted tasks could not be found.'], 409);
                foreach ($tasks as $task) $task->forceDelete();
                return response()->json(['success' => true, 'message' => 'Selected tasks and their scheduled segments were permanently deleted.']);
            });
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Permanent deletion was rolled back. ' . $e->getMessage()], 422);
        }
    }

    //slot setting 
    public function saveSlotSetting(Request $request)
    {
        $setting = SlotSetting::updateOrCreate(
            [
                'user_id' => $request->user_id,
            ],
            [
                'working_days'     => implode(',', $request->working_days),
                'start_work_time'  => $request->start_work_time,
                'end_work_time'    => $request->end_work_time,
                'start_break_time' => $request->start_break_time,
                'end_break_time'   => $request->end_break_time,
                'status'           => $request->status,
            ]
        );

        Holiday::where('setting_id', $setting->id)->delete();

        if (!empty($request->holidays)) {
            foreach ($request->holidays as $holiday) {

                if (
                    empty($holiday['holiday_name']) &&
                    empty($holiday['holiday_date'])
                ) {
                    continue;
                }

                Holiday::create([
                    'setting_id'   => $setting->id,
                    'holiday_name' => $holiday['holiday_name'],
                    'holiday_date' => $holiday['holiday_date'],
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Slot setting saved successfully.',
        ]);
    }

    public function getSlotSetting(Request $request) {
        $id = $request->id;
        
        $setting = SlotSetting::with('holidays')->where('slot_setting.user_id',$id)->first();
        return response()->json([
            'data' => $setting,
            'success' => 'true',
        ]);
    }
}
