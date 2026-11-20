<?php

namespace App\Helper;

use App\Models\Role;
use App\Models\Message;
use App\Events\MessageSent;
use Log;

class GeneralHelper
{
   
    public static function getRelatedRoleCode($role_id = null, $is_all = false)
    {
        $role = Role::find($role_id);
        if (!$role) {
            return []; 
        }
        $roleCode = $role->code;
        $userRoleCode = [
            'administrator' => ['administrator', 'manager', 'supervisor', 'agent'],
            'manager'       => ['manager', 'supervisor', 'agent'],
            'supervisor'    => ['supervisor', 'agent'],
            'agent'         => ['agent'],
        ];

        $relatedRoleCodes = isset($userRoleCode[$roleCode]) ? $userRoleCode[$roleCode] : [];
        if(!$is_all){
           $relatedRoleCodes = array_filter($relatedRoleCodes, function($item) use ($roleCode) {
                return $item != $roleCode;
            });
        }
        $relatedRoles = Role::where('company_id', $role->company_id)
                            ->whereIn('code', $relatedRoleCodes)
                            ->get(['id', 'code']);
        $result = null;
        $result['role_code'] = $relatedRoleCodes;
        foreach ($relatedRoles as $relatedRole) {
            $users = $relatedRole->user()->get(['id']);
            foreach ($users as $user) {
                $result['user_id'][] = $user->id;
            }
        }
        return $result; 
    }
    public static function sendChatHistoryMessage($data){
        $message = Message::create($data);
        $message = Message::where('id',$message->id)->first();
        event(new MessageSent($message));
    }
}