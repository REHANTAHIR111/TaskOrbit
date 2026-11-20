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
        $data = Task::where('user_id', $userID)->orderByDesc('id')->get();

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
        try {
            $userID = $request->user_id;

            // Validate basic fields
            $validator = Validator::make($request->all(), [
                'user_id' => 'required',
                'task_name' => 'required|string|max:255',
                'hour' => 'required|numeric|min:0.01',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date',
                'description' => 'nullable|string',
                'priority' => 'nullable|string',
                'status' => 'nullable|in:0,1',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check if settings exist
            $slotSetting = SlotSetting::where('user_id', $userID)->where('status', '1')->first();
            $hasSettings = (bool)$slotSetting;

            // Determine scheduling mode
            $startTime = $request->start_time;
            $endTime = $request->end_time;
            $isManual = false;

            // If settings exist and no times provided, use auto scheduling
            if ($hasSettings && (empty($startTime) || empty($endTime))) {
                // Auto scheduling mode
                return $this->autoScheduleTask($request, $slotSetting);
            } else {
                // Manual scheduling mode
                return $this->manualScheduleTask($request, $slotSetting);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error creating task: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Auto schedule task based on settings
     */
    private function autoScheduleTask($request, $slotSetting)
    {
        $userID = $request->user_id;
        $requiredHours = (float) $request->hour;
        $requiredMinutes = (int) round($requiredHours * 60);

        // ============================================================
        // STRICT BOUNDARIES: task must fit inside [start_date, end_date]
        // ============================================================
        $startDate = Carbon::parse($request->start_date)->startOfDay();
        $endDate   = Carbon::parse($request->end_date)->startOfDay();

        if ($endDate->lt($startDate)) {
            return response()->json([
                'success' => false,
                'message' => 'End date must be on or after start date.'
            ], 422);
        }

        if (empty($slotSetting->working_days) ||
            empty($slotSetting->start_work_time) ||
            empty($slotSetting->end_work_time)) {
            return response()->json([
                'success' => false,
                'message' => 'Please complete your working days and working hours settings before creating a task.'
            ], 422);
        }

        $workingDays = collect(explode(',', $slotSetting->working_days))
            ->map(fn($day) => (int) trim($day))
            ->filter(fn($day) => $day >= 1 && $day <= 7)
            ->unique()
            ->values()
            ->toArray();

        try {
            $workingStart = Carbon::parse($slotSetting->start_work_time);
            $workingEnd   = Carbon::parse($slotSetting->end_work_time);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid working time format in settings.'
            ], 422);
        }

        // Break parsing (correct columns + swap if reversed)
        $hasBreak = !empty($slotSetting->start_break_time) && !empty($slotSetting->end_break_time);
        $breakStart = null;
        $breakEnd = null;

        if ($hasBreak) {
            try {
                $breakStart = Carbon::parse($slotSetting->start_break_time);
                $breakEnd   = Carbon::parse($slotSetting->end_break_time);
                if ($breakStart->gte($breakEnd)) {
                    $tmp = $breakStart;
                    $breakStart = $breakEnd;
                    $breakEnd = $tmp;
                }
            } catch (\Throwable $e) {
                $hasBreak = false;
            }
        }

        $holidays = $slotSetting->holidays->pluck('holiday_date')->map(function($date) {
            return Carbon::parse($date)->format('Y-m-d');
        })->toArray();

        $isWorkingDay = function($date) use ($workingDays) {
            return in_array($date->dayOfWeekIso, $workingDays);
        };

        $isHoliday = function($date) use ($holidays) {
            return in_array($date->format('Y-m-d'), $holidays);
        };

        // ============================================================
        // RULE: If start_date is in the past, clamp to today
        // RULE: If start_date is today, only use time from "now" onward
        // ============================================================
        $today = Carbon::today();
        if ($startDate->lt($today)) {
            $startDate = $today->copy();
        }

        $remainingMinutes = $requiredMinutes;
        $taskStartDate = null;
        $taskEndDate = null;
        $taskStartTime = null;
        $taskEndTime = null;
        $dailySchedule = [];
        $totalAvailableMinutes = 0;
        $skippedDays = [];

        // ============================================================
        // Iterate from startDate → endDate (STRICT — nothing outside)
        // ============================================================
        $currentDate = $startDate->copy();

        while ($currentDate->lte($endDate) && $remainingMinutes > 0) {

            // Skip non-working days and holidays
            if (!$isWorkingDay($currentDate) || $isHoliday($currentDate)) {
                $skippedDays[] = $currentDate->format('Y-m-d');
                $dailySchedule[] = [
                    'date' => $currentDate->format('Y-m-d'),
                    'available' => false,
                    'reason' => $isHoliday($currentDate) ? 'Holiday' : 'Non-working day',
                    'minutes_allocated' => 0
                ];
                $currentDate->addDay();
                continue;
            }

            $dayStart = $currentDate->copy()->setTime($workingStart->hour, $workingStart->minute, 0);
            $dayEnd   = $currentDate->copy()->setTime($workingEnd->hour, $workingEnd->minute, 0);

            // If today, clamp start to now
            if ($currentDate->isToday()) {
                $now = now();
                if ($now->gte($dayEnd)) {
                    $dailySchedule[] = [
                        'date' => $currentDate->format('Y-m-d'),
                        'available' => false,
                        'reason' => 'Working hours ended',
                        'minutes_allocated' => 0
                    ];
                    $currentDate->addDay();
                    continue;
                }
                if ($now->gt($dayStart)) {
                    $dayStart = $now->copy();
                }
            }

            // Gather ALL existing tasks for this date
            $existingTasks = Task::where('user_id', $request->user_id)
                ->whereNull('deleted_at')
                ->whereDate('start_date', '<=', $currentDate->format('Y-m-d'))
                ->whereDate('end_date', '>=', $currentDate->format('Y-m-d'))
                ->whereNotNull('start_time')
                ->whereNotNull('end_time')
                ->orderBy('start_time')
                ->get();

            $blockedPeriods = [];

            foreach ($existingTasks as $task) {
                try {
                    $taskStart = Carbon::parse($currentDate->format('Y-m-d') . ' ' . $task->start_time);
                    $taskEnd   = Carbon::parse($currentDate->format('Y-m-d') . ' ' . $task->end_time);

                    if (Carbon::parse($task->start_date)->lt($currentDate)) {
                        $taskStart = $dayStart->copy();
                    }
                    if (Carbon::parse($task->end_date)->gt($currentDate)) {
                        $taskEnd = $dayEnd->copy();
                    }

                    if (!$taskStart->lt($taskEnd)) continue;
                    if ($taskEnd->lte($dayStart)) continue;
                    if ($taskStart->gte($dayEnd)) continue;

                    $taskStart = $taskStart->max($dayStart);
                    $taskEnd   = $taskEnd->min($dayEnd);

                    if ($taskStart->lt($taskEnd)) {
                        $blockedPeriods[] = ['start' => $taskStart, 'end' => $taskEnd];
                    }
                } catch (\Exception $e) {
                    continue;
                }
            }

            // Break as blocked
            if ($hasBreak && $breakStart && $breakEnd) {
                try {
                    $breakStartTime = $currentDate->copy()->setTime($breakStart->hour, $breakStart->minute, 0);
                    $breakEndTime   = $currentDate->copy()->setTime($breakEnd->hour, $breakEnd->minute, 0);

                    if ($breakStartTime->lt($breakEndTime) &&
                        $breakEndTime->gt($dayStart) &&
                        $breakStartTime->lt($dayEnd)) {

                        $breakStartClamped = $breakStartTime->max($dayStart);
                        $breakEndClamped   = $breakEndTime->min($dayEnd);

                        if ($breakStartClamped->lt($breakEndClamped)) {
                            $blockedPeriods[] = [
                                'start' => $breakStartClamped,
                                'end' => $breakEndClamped
                            ];
                        }
                    }
                } catch (\Exception $e) {}
            }

            usort($blockedPeriods, fn($a, $b) => $a['start']->timestamp <=> $b['start']->timestamp);

            $mergedBlocked = [];
            foreach ($blockedPeriods as $block) {
                if (empty($mergedBlocked)) {
                    $mergedBlocked[] = ['start' => $block['start']->copy(), 'end' => $block['end']->copy()];
                    continue;
                }
                $i = count($mergedBlocked) - 1;
                if ($block['start']->lte($mergedBlocked[$i]['end'])) {
                    if ($block['end']->gt($mergedBlocked[$i]['end'])) {
                        $mergedBlocked[$i]['end'] = $block['end']->copy();
                    }
                } else {
                    $mergedBlocked[] = ['start' => $block['start']->copy(), 'end' => $block['end']->copy()];
                }
            }

            // Free periods
            $freePeriods = [];
            $cursor = $dayStart->copy();

            foreach ($mergedBlocked as $block) {
                if ($cursor->gte($block['start']) && $cursor->lt($block['end'])) {
                    $cursor = $block['end']->copy();
                }
            }

            foreach ($mergedBlocked as $block) {
                if ($block['end']->lte($cursor)) continue;

                if ($block['start']->gt($cursor)) {
                    $freeStart = $cursor->copy();
                    $freeEnd   = $block['start']->copy();
                    if ($freeStart->lt($dayStart)) $freeStart = $dayStart->copy();
                    if ($freeEnd->gt($dayEnd)) $freeEnd = $dayEnd->copy();
                    if ($freeStart->lt($freeEnd)) {
                        $freePeriods[] = ['start' => $freeStart, 'end' => $freeEnd];
                    }
                }

                if ($block['end']->gt($cursor)) {
                    $cursor = $block['end']->copy();
                }
                if ($cursor->gte($dayEnd)) break;
            }

            if ($cursor->lt($dayEnd)) {
                $freePeriods[] = ['start' => $cursor->copy(), 'end' => $dayEnd->copy()];
            }

            // Available minutes
            $dayAvailableMinutes = 0;
            foreach ($freePeriods as $period) {
                $m = $period['start']->diffInMinutes($period['end']);
                if ($m > 0) $dayAvailableMinutes += $m;
            }

            $totalAvailableMinutes += $dayAvailableMinutes;
            $dayAllocated = 0;

            // Allocation — prefer a single free period so break is never crossed
            foreach ($freePeriods as $period) {
                if ($remainingMinutes <= 0) break;

                $periodMinutes = $period['start']->diffInMinutes($period['end']);
                if ($periodMinutes <= 0) continue;

                if (!$taskStartDate) {
                    $taskStartDate = $currentDate->copy();
                    $taskStartTime = $period['start']->format('H:i:s');
                }

                if ($remainingMinutes <= $periodMinutes) {
                    $calcEnd = $period['start']->copy()->addMinutes($remainingMinutes);
                    $taskEndDate = $currentDate->copy();
                    $taskEndTime = $calcEnd->format('H:i:s');
                    $dayAllocated += $remainingMinutes;
                    $remainingMinutes = 0;
                    break;
                } else {
                    $remainingMinutes -= $periodMinutes;
                    $dayAllocated += $periodMinutes;
                    $taskEndDate = $currentDate->copy();
                    $taskEndTime = $period['end']->format('H:i:s');
                }
            }

            $dailySchedule[] = [
                'date' => $currentDate->format('Y-m-d'),
                'available' => true,
                'available_minutes' => $dayAvailableMinutes,
                'available_hours' => round($dayAvailableMinutes / 60, 1),
                'minutes_allocated' => $dayAllocated,
                'hours_allocated' => round($dayAllocated / 60, 1),
                'free_periods' => array_map(function($p) {
                    return [
                        'start' => $p['start']->format('H:i'),
                        'end'   => $p['end']->format('H:i'),
                        'minutes' => $p['start']->diffInMinutes($p['end'])
                    ];
                }, $freePeriods),
                'blocked_periods' => array_map(function($b) {
                    return [
                        'start' => $b['start']->format('H:i'),
                        'end'   => $b['end']->format('H:i')
                    ];
                }, $mergedBlocked)
            ];

            $currentDate->addDay();
        }

        // ============================================================
        // If task still has remaining minutes → hard fail (do NOT spill)
        // ============================================================
        if ($remainingMinutes > 0) {
            $requiredHoursFormatted = number_format($requiredMinutes / 60, 1);
            $availableHoursFormatted = number_format($totalAvailableMinutes / 60, 1);
            $shortFormatted = number_format($remainingMinutes / 60, 1);

            $skippedText = '';
            if (!empty($skippedDays)) {
                $skippedText = ' Skipped ' . count($skippedDays) . ' non-working day(s).';
            }

            return response()->json([
                'success' => false,
                'message' => "Cannot fit task within selected dates ({$startDate->format('Y-m-d')} → {$endDate->format('Y-m-d')}). Need {$requiredHoursFormatted}h, available {$availableHoursFormatted}h. Short by {$shortFormatted}h.{$skippedText}",
                'details' => [
                    'required_minutes' => $requiredMinutes,
                    'available_minutes' => $totalAvailableMinutes,
                    'short_by_minutes' => $remainingMinutes,
                    'required_hours' => (float) $requiredHoursFormatted,
                    'available_hours' => (float) $availableHoursFormatted,
                    'short_by_hours' => (float) $shortFormatted,
                    'date_range' => [
                        'start' => $startDate->format('Y-m-d'),
                        'end'   => $endDate->format('Y-m-d'),
                    ],
                    'skipped_days' => $skippedDays,
                    'daily_schedule' => $dailySchedule
                ]
            ], 422);
        }

        if (!$taskStartDate || !$taskEndDate || !$taskStartTime || !$taskEndTime) {
            return response()->json([
                'success' => false,
                'message' => 'Unable to schedule task. Please check your settings.'
            ], 422);
        }

        $task = Task::create([
            'user_id'     => $request->user_id,
            'task_name'   => $request->task_name,
            'description' => $request->description,
            'priority'    => $request->priority,
            'status'      => $request->status ?? '0',
            'hour'        => $request->hour,
            'start_date'  => $taskStartDate->format('Y-m-d'),
            'end_date'    => $taskEndDate->format('Y-m-d'),
            'start_time'  => $taskStartTime,
            'end_time'    => $taskEndTime,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Task created successfully with auto-scheduling.',
            'data' => [
                'task' => $task,
                'schedule_details' => [
                    'start_date' => $taskStartDate->format('Y-m-d'),
                    'end_date'   => $taskEndDate->format('Y-m-d'),
                    'start_time' => $taskStartTime,
                    'end_time'   => $taskEndTime,
                    'total_hours' => number_format($requiredHours, 1),
                    'daily_breakdown' => $dailySchedule
                ]
            ]
        ], 201);
    }

    /**
     * Manual schedule task
     */
    private function manualScheduleTask($request, $slotSetting)
    {
        $validator = Validator::make($request->all(), [
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide start time and end time for manual scheduling.'
            ], 422);
        }

        $startDate = Carbon::parse($request->start_date)->startOfDay();
        $endDate = Carbon::parse($request->end_date)->startOfDay();
        $startDateTime = $startDate->copy()->setTimeFromTimeString($request->start_time);
        $endDateTime = $endDate->copy()->setTimeFromTimeString($request->end_time);

        if ($startDate->gt($endDate) || $startDateTime->gte($endDateTime)) {
            return response()->json([
                'success' => false,
                'message' => 'End date and time must be after the start date and time.'
            ], 422);
        }

        if ($slotSetting) {
            $workingDays = collect(explode(',', (string) $slotSetting->working_days))
                ->map(fn ($day) => (int) trim($day))
                ->filter(fn ($day) => $day >= 1 && $day <= 7)
                ->values()
                ->all();

            $workingStart = Carbon::parse($slotSetting->start_work_time);
            $workingEnd = Carbon::parse($slotSetting->end_work_time);
            $hasBreak = !empty($slotSetting->start_break_time) && !empty($slotSetting->end_break_time);
            $breakStart = $hasBreak ? Carbon::parse($slotSetting->start_break_time)->format('H:i:s') : null;
            $breakEnd = $hasBreak ? Carbon::parse($slotSetting->end_break_time)->format('H:i:s') : null;
            $holidays = $slotSetting->holidays->pluck('holiday_date')->map(
                fn ($date) => Carbon::parse($date)->format('Y-m-d')
            )->all();

            for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
                $dateKey = $date->format('Y-m-d');
                if (!in_array($date->dayOfWeekIso, $workingDays, true)) {
                    return response()->json([
                        'success' => false,
                        'message' => "The selected range includes a non-working day ({$dateKey})."
                    ], 422);
                }
                if (in_array($dateKey, $holidays, true)) {
                    return response()->json([
                        'success' => false,
                        'message' => "The selected range includes a holiday ({$dateKey})."
                    ], 422);
                }

                $dailyStart = $date->copy()->setTimeFromTimeString(
                    $date->isSameDay($startDate) ? $request->start_time : $workingStart->format('H:i:s')
                );
                $dailyEnd = $date->copy()->setTimeFromTimeString(
                    $date->isSameDay($endDate) ? $request->end_time : $workingEnd->format('H:i:s')
                );

                if ($dailyStart->lt($date->copy()->setTimeFromTimeString($workingStart->format('H:i:s'))) ||
                    $dailyEnd->gt($date->copy()->setTimeFromTimeString($workingEnd->format('H:i:s'))) ||
                    !$dailyStart->lt($dailyEnd)) {
                    return response()->json([
                        'success' => false,
                        'message' => "The selected time is outside working hours on {$dateKey}."
                    ], 422);
                }

                if ($hasBreak && $dailyStart->format('H:i:s') < $breakEnd &&
                    $dailyEnd->format('H:i:s') > $breakStart) {
                    return response()->json([
                        'success' => false,
                        'message' => "The selected range overlaps the configured break on {$dateKey}."
                    ], 422);
                }

                // Compare the requested interval with every task occupying this date.
                $existingTasks = Task::where('user_id', $request->user_id)
                    ->whereNull('deleted_at')
                    ->whereDate('start_date', '<=', $dateKey)
                    ->whereDate('end_date', '>=', $dateKey)
                    ->whereNotNull('start_time')
                    ->whereNotNull('end_time')
                    ->get();

                foreach ($existingTasks as $existingTask) {
                    $existingStart = $date->copy()->setTimeFromTimeString(
                        Carbon::parse($existingTask->start_date)->isSameDay($date)
                            ? $existingTask->start_time
                            : $workingStart->format('H:i:s')
                    );
                    $existingEnd = $date->copy()->setTimeFromTimeString(
                        Carbon::parse($existingTask->end_date)->isSameDay($date)
                            ? $existingTask->end_time
                            : $workingEnd->format('H:i:s')
                    );

                    // Half-open intervals: adjacent tasks (e.g. 10:00-11:00 and
                    // 11:00-12:00) are valid; containment and exact matches conflict.
                    if ($dailyStart->lt($existingEnd) && $dailyEnd->gt($existingStart)) {
                        return response()->json([
                            'success' => false,
                            'message' => "The selected time conflicts with task '{$existingTask->task_name}' on {$dateKey}."
                        ], 422);
                    }
                }
            }
        }

        $actualMinutes = $startDateTime->diffInMinutes($endDateTime);
        $actualHours = round($actualMinutes / 60, 2);

        $task = Task::create([
            'user_id' => $request->user_id,
            'task_name' => $request->task_name,
            'description' => $request->description,
            'priority' => $request->priority,
            'status' => $request->status ?? '0',
            'hour' => $request->hour,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Task created successfully with manual schedule.',
            'data' => [
                'task' => $task,
                'actual_hours' => $actualHours
            ]
        ], 201);
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

    public function edit(Request $request, $id) {
        $editData = Task::find($id);

        return response()->json([
            'editdata' => $editData,
        ]);
    }

   public function update(Request $request, $id) {
        $task = Task::find($id);
        
        if (!$task) {
            return response()->json([
                'success' => 'false',
                'message' => 'Task not found!'
            ], 404);
        }
        
        $task->update([
            'task_name' => $request->task_name,
            'description' => $request->description,
            'priority' => $request->priority,
            'status' => $request->status,
            'hour' => $request->hour,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
        ]);

        return response()->json([
            'success' => 'true',
            'message' => 'Task has been updated Successfully!'
        ]);
    }

    /**
     * Soft delete a task. When reflow=1, later tasks are moved into the
     * earliest available time slots, in their existing chronological order.
     * The operation is atomic: if any task cannot fit, nothing is changed.
     */
    public function destroy(Request $request, $id)
    {
        $task = Task::whereKey($id)->first();
        if (!$task) {
            return response()->json(['success' => false, 'message' => 'Task not found.'], 404);
        }

        $reflow = filter_var($request->query('reflow', false), FILTER_VALIDATE_BOOLEAN);
        if (!$reflow) {
            $task->delete();
            return response()->json([
                'success' => true,
                'message' => 'Task has been deleted successfully.'
            ]);
        }

        $setting = SlotSetting::with('holidays')->where('user_id', $task->user_id)
            ->where('status', '1')->first();
        if (!$setting) {
            return response()->json([
                'success' => false,
                'message' => 'Active working-time settings are required to reschedule following tasks.'
            ], 422);
        }

        try {
            return DB::transaction(function () use ($task, $setting) {
                $deletedStart = Carbon::parse($task->start_date)->startOfDay();
                $deletedStartTime = $task->start_time ?: '00:00:00';
                $anchor = $deletedStart->copy()->setTimeFromTimeString($deletedStartTime);

                $laterTasks = Task::where('user_id', $task->user_id)
                    ->whereNull('deleted_at')
                    ->where('id', '<>', $task->id)
                    ->where(function ($query) use ($anchor) {
                        $query->whereDate('start_date', '>', $anchor->format('Y-m-d'))
                            ->orWhere(function ($sameDay) use ($anchor) {
                                $sameDay->whereDate('start_date', $anchor->format('Y-m-d'))
                                    ->where('start_time', '>', $anchor->format('H:i:s'));
                            });
                    })
                    ->orderBy('start_date')->orderBy('start_time')->orderBy('id')
                    ->lockForUpdate()->get();

                // Temporarily release every later task's old slot so earlier
                // tasks can be packed into the newly opened time without being
                // blocked by tasks that are themselves waiting to move.
                foreach ($laterTasks as $queuedTask) {
                    $queuedTask->update(['start_time' => null, 'end_time' => null]);
                }

                $task->delete();
                $moved = [];

                foreach ($laterTasks as $laterTask) {
                    $minutes = (int) round(((float) $laterTask->hour) * 60);
                    if ($minutes <= 0) {
                        throw new \RuntimeException(
                            "Task '{$laterTask->task_name}' (task #{$laterTask->id}) has no valid duration and cannot be rescheduled."
                        );
                    }

                    $taskDeadline = Carbon::parse($laterTask->end_date)->startOfDay();
                    if ($taskDeadline->lt($deletedStart)) {
                        throw new \RuntimeException(
                            "Task '{$laterTask->task_name}' (task #{$laterTask->id}) has an invalid scheduling deadline."
                        );
                    }

                    // The old end date is the task's known scheduling deadline.
                    // Start searching from the deleted task's start date so a
                    // newly opened earlier slot can be used.
                    $allocation = $this->findAvailableTaskAllocation(
                        $laterTask->user_id,
                        $anchor->copy(),
                        $taskDeadline,
                        $minutes,
                        $setting,
                        $laterTask->id
                    );

                    if (!$allocation) {
                        throw new \RuntimeException(
                            "Could not reschedule '{$laterTask->task_name}' (task #{$laterTask->id}) within its existing end date."
                        );
                    }

                    $laterTask->update([
                        'start_date' => $allocation['start_date'],
                        'end_date' => $allocation['end_date'],
                        'start_time' => $allocation['start_time'],
                        'end_time' => $allocation['end_time'],
                    ]);

                    $moved[] = [
                        'id' => $laterTask->id,
                        'task_name' => $laterTask->task_name,
                        'start_date' => $allocation['start_date'],
                        'start_time' => $allocation['start_time'],
                        'end_date' => $allocation['end_date'],
                        'end_time' => $allocation['end_time'],
                    ];
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Task deleted and following tasks rescheduled successfully.',
                    'rescheduled' => $moved,
                ]);
            });
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'No tasks were changed. ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Find the earliest contiguous working-time allocation for a task.
     * Daily breaks, holidays, non-working days and existing tasks are blocked.
     */
    private function findAvailableTaskAllocation($userId, Carbon $rangeStart, Carbon $rangeEnd, int $requiredMinutes, $setting, $excludeTaskId = null)
    {
        if ($rangeEnd->copy()->startOfDay()->lt($rangeStart->copy()->startOfDay()) || empty($setting->working_days) ||
            empty($setting->start_work_time) || empty($setting->end_work_time)) {
            return null;
        }

        $workingDays = collect(explode(',', (string) $setting->working_days))
            ->map(fn ($day) => (int) trim($day))->filter(fn ($day) => $day >= 1 && $day <= 7)->all();
        $workingStart = Carbon::parse($setting->start_work_time);
        $workingEnd = Carbon::parse($setting->end_work_time);
        if ($workingStart->gte($workingEnd)) return null;

        $hasBreak = !empty($setting->start_break_time) && !empty($setting->end_break_time);
        $breakStart = $hasBreak ? Carbon::parse($setting->start_break_time) : null;
        $breakEnd = $hasBreak ? Carbon::parse($setting->end_break_time) : null;
        if ($hasBreak && $breakStart->gte($breakEnd)) return null;

        $holidays = $setting->holidays->pluck('holiday_date')->map(
            fn ($date) => Carbon::parse($date)->format('Y-m-d')
        )->all();

        $firstStart = null;
        $lastEnd = null;
        $remaining = $requiredMinutes;

        for ($date = $rangeStart->copy()->startOfDay(); $date->lte($rangeEnd->copy()->startOfDay()) && $remaining > 0; $date->addDay()) {
            $dateKey = $date->format('Y-m-d');
            if (!in_array($date->dayOfWeekIso, $workingDays, true) || in_array($dateKey, $holidays, true)) {
                continue;
            }

            $dayStart = $date->copy()->setTime($workingStart->hour, $workingStart->minute, 0);
            $dayEnd = $date->copy()->setTime($workingEnd->hour, $workingEnd->minute, 0);
            if ($date->isSameDay($rangeStart)) {
                $dayStart = $dayStart->max($rangeStart);
            }
            if ($date->isToday()) {
                $dayStart = $dayStart->max(now());
            }
            if (!$dayStart->lt($dayEnd)) continue;

            $blocks = [];
            if ($hasBreak) {
                $bs = $date->copy()->setTime($breakStart->hour, $breakStart->minute, 0)->max($dayStart);
                $be = $date->copy()->setTime($breakEnd->hour, $breakEnd->minute, 0)->min($dayEnd);
                if ($bs->lt($be)) $blocks[] = ['start' => $bs, 'end' => $be, 'type' => 'break'];
            }

            $existing = Task::where('user_id', $userId)->whereNull('deleted_at')
                ->when($excludeTaskId, fn ($q) => $q->where('id', '<>', $excludeTaskId))
                ->whereDate('start_date', '<=', $dateKey)->whereDate('end_date', '>=', $dateKey)
                ->whereNotNull('start_time')->whereNotNull('end_time')->get();

            foreach ($existing as $other) {
                $otherStartDate = Carbon::parse($other->start_date);
                $otherEndDate = Carbon::parse($other->end_date);
                $bs = $date->copy()->setTimeFromTimeString(
                    $otherStartDate->isSameDay($date) ? $other->start_time : $workingStart->format('H:i:s')
                )->max($dayStart);
                $be = $date->copy()->setTimeFromTimeString(
                    $otherEndDate->isSameDay($date) ? $other->end_time : $workingEnd->format('H:i:s')
                )->min($dayEnd);
                if ($bs->lt($be)) $blocks[] = ['start' => $bs, 'end' => $be, 'type' => 'task'];
            }

            usort($blocks, fn ($a, $b) => $a['start']->timestamp <=> $b['start']->timestamp);
            $cursor = $dayStart->copy();
            foreach ($blocks as $block) {
                if ($block['end']->lte($cursor)) continue;
                // The current schema stores only one start/end interval per task.
                // Do not compress a schedule across another task's occupied time:
                // that would falsely make the rescheduled task overlap it.
                if (($block['type'] ?? null) === 'task' && $firstStart && $remaining > 0) {
                    return null;
                }
                if ($block['start']->gt($cursor)) {
                    $periodEnd = $block['start']->copy();
                    $available = $cursor->diffInMinutes($periodEnd);
                    $take = min($remaining, $available);
                    if ($take > 0) {
                        if (!$firstStart) $firstStart = $cursor->copy();
                        $lastEnd = $cursor->copy()->addMinutes($take);
                        $remaining -= $take;
                        if ($remaining === 0) break 2;
                    }
                }
                if ($block['end']->gt($cursor)) $cursor = $block['end']->copy();
            }

            if ($cursor->lt($dayEnd) && $remaining > 0) {
                $available = $cursor->diffInMinutes($dayEnd);
                $take = min($remaining, $available);
                if ($take > 0) {
                    if (!$firstStart) $firstStart = $cursor->copy();
                    $lastEnd = $cursor->copy()->addMinutes($take);
                    $remaining -= $take;
                    if ($remaining === 0) break;
                }
            }
        }

        if ($remaining > 0 || !$firstStart || !$lastEnd) return null;

        return [
            'start_date' => $firstStart->format('Y-m-d'),
            'start_time' => $firstStart->format('H:i:s'),
            'end_date' => $lastEnd->format('Y-m-d'),
            'end_time' => $lastEnd->format('H:i:s'),
        ];
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
        $data = Task::onlyTrashed()->where('user_id', $request->id)->get();

        return response()->json([
            'data' => $data,
        ]);
    }

    public function restoreData($id) {
        $task = Task::onlyTrashed()->find($id);

        $task->restore();

        return response()->json([
            'success' => 'true',
            'message' => 'Task restored successfully!'
        ]);
    }

    public function restoreMultiData(Request $request) {
        $ids = $request->id;

        if (is_string($ids)) {
            $idsArray = explode(',',  $ids);
        } else{
            $idsArray = $ids;
        }
        
        $task = Task::whereIn('id', $idsArray)->restore();
        return response()->json([
            'success' => 'true',
            'message' => 'Task restored successfully!'
        ]);
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
