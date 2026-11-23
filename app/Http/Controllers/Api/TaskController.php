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
        $startAt = $startDate->isToday() ? now() : null;
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
                $request->merge(['user_id' => $task->user_id]);
                $setting = SlotSetting::with('holidays')->where('user_id', $task->user_id)->first();
                if ($request->boolean('auto_schedule')) {
                    if (!$setting || (string) $setting->status !== '1') {
                        return response()->json(['success' => false, 'message' => 'Active working-time settings are required for automatic scheduling.'], 422);
                    }
                    return $this->autoScheduleTask($request, $setting, (int) $task->id);
                }
                return $this->manualScheduleTask($request, $setting, (int) $task->id);
            });
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Task update failed: ' . $e->getMessage()], 422);
        }
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

                $setting = SlotSetting::with('holidays')->where('user_id', $task->user_id)->where('status', '1')->first();
                if (!$setting) {
                    return response()->json(['success' => false, 'message' => 'Active working-time settings are required to reschedule following tasks.'], 422);
                }
                $break = $this->getValidatedBreakSetting($setting);
                if ($break['invalid']) {
                    return response()->json(['success' => false, 'message' => $break['message']], 422);
                }
                if (empty($setting->working_days) || empty($setting->start_work_time) || empty($setting->end_work_time)) {
                    return response()->json(['success' => false, 'message' => 'Complete working days and hours before rescheduling following tasks.'], 422);
                }
                try {
                    $workStart = Carbon::parse($setting->start_work_time);
                    $workEnd = Carbon::parse($setting->end_work_time);
                } catch (\Throwable $e) {
                    return response()->json(['success' => false, 'message' => 'Working-hour settings contain invalid times.'], 422);
                }
                if (!$workStart->lt($workEnd) || ($break['has_break'] && (
                    $break['start']->format('H:i:s') < $workStart->format('H:i:s') ||
                    $break['end']->format('H:i:s') > $workEnd->format('H:i:s')
                ))) {
                    return response()->json(['success' => false, 'message' => 'Working hours or break times are invalid.'], 422);
                }

                $targetSegments = $task->segments->sortBy([['segment_date', 'asc'], ['start_time', 'asc']])->values();
                $anchor = $targetSegments->isNotEmpty()
                    ? Carbon::parse($targetSegments[0]->segment_date->format('Y-m-d') . ' ' . $targetSegments[0]->start_time)
                    : Carbon::parse($task->start_date . ' ' . ($task->start_time ?: '00:00:00'));

                $laterTasks = Task::with('segments')->where('user_id', $task->user_id)
                    ->whereNull('deleted_at')->where('id', '<>', $task->id)
                    ->lockForUpdate()->get()
                    ->filter(function ($candidate) use ($anchor) {
                        $first = $candidate->segments->sortBy([['segment_date', 'asc'], ['start_time', 'asc']])->first();
                        if (!$first) return false;
                        $candidateStart = Carbon::parse($first->segment_date->format('Y-m-d') . ' ' . $first->start_time);
                        return $candidateStart->gt($anchor);
                    })
                    ->sortBy(function ($candidate) {
                        $first = $candidate->segments->sortBy([['segment_date', 'asc'], ['start_time', 'asc']])->first();
                        return $first ? $first->segment_date->format('Y-m-d') . ' ' . $first->start_time : '';
                    })->values();

                $durations = [];
                foreach ($laterTasks as $laterTask) {
                    $durations[$laterTask->id] = (int) $laterTask->segments->sum('allocated_minutes');
                    $laterTask->segments()->delete();
                }
                $task->delete();

                $scheduler = new \App\Services\TaskSchedulingService();
                $moved = [];
                foreach ($laterTasks as $laterTask) {
                    // Use the duration captured before releasing the old segments.
                    $duration = $durations[$laterTask->id] ?? 0;
                    if ($duration <= 0) {
                        throw new \RuntimeException("Task '{$laterTask->task_name}' (task #{$laterTask->id}) has no valid segment duration.");
                    }
                    $deadline = $laterTask->end_date ? Carbon::parse($laterTask->end_date)->startOfDay() : null;
                    if (!$deadline) {
                        throw new \RuntimeException("Task '{$laterTask->task_name}' (task #{$laterTask->id}) has no end-date deadline.");
                    }

                    $segments = $scheduler->allocate((int) $laterTask->user_id, $anchor->copy()->startOfDay(), $deadline, $duration, $setting, (int) $laterTask->id, $anchor);
                    if (!$segments) {
                        throw new \RuntimeException("Could not reschedule '{$laterTask->task_name}' (task #{$laterTask->id}) within its existing end date.");
                    }

                    $summary = $scheduler->summarize($segments);
                    $laterTask->fill([
                        'start_date' => $summary['start_date'],
                        'start_time' => $summary['start_time'],
                        'end_date' => $summary['end_date'],
                        'end_time' => $summary['end_time'],
                        'hour' => $summary['total_minutes'] / 60,
                    ])->save();
                    $scheduler->writeSegments($laterTask, $segments);
                    $moved[] = [
                        'id' => $laterTask->id,
                        'task_name' => $laterTask->task_name,
                        'start_date' => $summary['start_date'],
                        'start_time' => $summary['start_time'],
                        'end_date' => $summary['end_date'],
                        'end_time' => $summary['end_time'],
                        'segments' => $segments,
                    ];
                }

                return response()->json(['success' => true, 'message' => 'Task deleted and following tasks rescheduled successfully.', 'rescheduled' => $moved]);
            });
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'No tasks were changed. ' . $e->getMessage()], 422);
        }
    }

    public function multidelete(Request $request) {
        $ids = $request->id;
        
        if (empty($ids)) {
            return response()->json([
                'success' => 'false',
                'message' => 'No tasks selected!'
            ], 400);
        }

        if (is_string($ids)) {
            $idsArray = explode(',', $ids);
        } else {
            $idsArray = $ids;
        }
        
        Task::whereIn('id', $idsArray)->delete();
        
        return response()->json([
            'success' => 'true',
            'message' => 'Tasks deleted successfully!'
        ]);
    }

    public function getDeletedData(Request $request) {
        $data = Task::onlyTrashed()->with('segments')->where('user_id', $request->id)->get();
        $data->each(fn ($task) => $task->setAttribute('total_allocated_minutes', (int) $task->segments->sum('allocated_minutes')));

        return response()->json([
            'data' => $data,
        ]);
    }

    public function restoreData($id)
    {
        return DB::transaction(function () use ($id) {
            $initial = Task::onlyTrashed()->whereKey($id)->first();
            if (!$initial) {
                return response()->json(['success' => false, 'message' => 'Deleted task not found.'], 404);
            }
            DB::table('users')->where('id', $initial->user_id)->lockForUpdate()->first();
            $task = Task::onlyTrashed()->with('segments')->whereKey($id)->lockForUpdate()->first();
            if (!$task || (int) $task->user_id !== (int) $initial->user_id) {
                return response()->json(['success' => false, 'message' => 'Task changed while restore was starting. Please retry.'], 409);
            }
            $segments = $task->segments->map(fn ($segment) => $segment->toArray())->all();
            if ((new \App\Services\TaskSchedulingService())->hasOverlap((int) $task->user_id, $segments)) {
                return response()->json(['success' => false, 'message' => 'The task cannot be restored because one or more scheduled segments are now occupied.'], 422);
            }
            $task->restore();
            return response()->json(['success' => true, 'message' => 'Task restored successfully.']);
        });
    }

    public function restoreMultiData(Request $request)
    {
        $ids = is_string($request->id) ? explode(',', $request->id) : (array) $request->id;
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) {
            return response()->json(['success' => false, 'message' => 'No tasks selected.'], 400);
        }

        return DB::transaction(function () use ($ids) {
            $userIds = Task::onlyTrashed()->whereIn('id', $ids)->pluck('user_id')->unique()->sort();
            foreach ($userIds as $userId) {
                DB::table('users')->where('id', $userId)->lockForUpdate()->first();
            }
            $tasks = Task::onlyTrashed()->with('segments')->whereIn('id', $ids)->orderBy('user_id')->orderBy('id')->lockForUpdate()->get();

            $scheduler = new \App\Services\TaskSchedulingService();
            $selectedSegments = [];
            foreach ($tasks as $task) {
                $segments = $task->segments->map(fn ($segment) => $segment->toArray())->all();
                if ($scheduler->hasOverlap((int) $task->user_id, $segments)) {
                    return response()->json(['success' => false, 'message' => "Task {$task->id} conflicts with an active scheduled segment and cannot be restored."], 422);
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

            foreach ($tasks as $task) {
                $task->restore();
            }
            return response()->json(['success' => true, 'message' => 'Tasks restored successfully.']);
        });
    }

    public function taskDeletePermanant($id) {
        $task = Task::onlyTrashed()->find($id);

        $task->forceDelete();

        return response()->json([
            'success' => 'true',
            'message' => 'Task has been Deleted Permanantly!'
        ]);
    }

    public function taskMultiDeletePermanant(Request $request) {
        $ids = $request->id;

        if (is_string($ids)) {
            $idsArray = explode(',',  $ids);
        } else{
            $idsArray = $ids;
        }
        
        $task = Task::whereIn('id', $idsArray)->forceDelete();
        return response()->json([
            'success' => 'true',
            'message' => 'Task has been Deleted Permanantly!'
        ]);
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
