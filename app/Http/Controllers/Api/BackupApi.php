<?php

namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Task;
use App\Models\SlotSetting;
use App\Models\Holiday;
use Carbon\Carbon;


class TaskController extends Controller
{
    public function create(Request $request) {
        $userID = $request->user_id;
        $settingFilled = false;
        $availableSettingStartTime = '';
        $availableSettingEndTime = '';
        $taskHours = $request->hour ?? 0;
        $availableStartTime = '';
        $CalcaltedEndTime = '';
        $settingStartTime = '';
        $settingEndTime = '';
        $settingWorkingDays = '';
        $AvailableStartDate = '';
        
        $SlotSetting = SlotSetting::where('user_id', $userID)->where('status', '1')->first();
        $PrevTask = Task::where('user_id', $userID)->orderByDesc('id')->first();

        if($SlotSetting) {
            $settingFilled = true;

            $settingStartTime = $SlotSetting->start_work_time;
            $settingEndTime = $SlotSetting->end_work_time;
            $settingBreakStartTime = $SlotSetting->start_break_time;
            $settingBreakEndTime = $SlotSetting->end_break_time;
            $settingWorkingDays = $SlotSetting->working_days;
            $currentTime = now()->toTimeString();
            
            if($currentTime >= $settingEndTime) {
            }
            
            $availableSettingStartTime = Carbon::parse($settingStartTime);
            $availableSettingEndTime = Carbon::parse($settingEndTime);
            
            if($PrevTask) {
                $PrevTaskEndTime = $PrevTask->end_time;
                $availableStartTime = Carbon::parse($PrevTaskEndTime)->format('H:i');

                if($taskHours) {
                    $CalcaltedEndTime = Carbon::parse($availableStartTime)->addHours((float) $taskHours)->format('h:i A');
                }
            } else{
                $availableStartTime = Carbon::parse($availableSettingStartTime)->format('H:i');
                
                if($taskHours) {
                    $CalcaltedEndTime = Carbon::parse($availableStartTime)->addHours((float) $taskHours)->format('h:i A');
                }
            }
        }

        return response()->json([
            'setting_filled' => $settingFilled,
            'available_start_time' => $availableStartTime,
            'calcalted_end_time' => $CalcaltedEndTime,
        ], 200);
    }
}
