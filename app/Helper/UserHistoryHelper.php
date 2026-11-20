<?php

namespace App\Services;
use App\Models\UserHistory;

class UserHistoryService
{
    static function StoreUserHistory(?int $userId = null, ?int $moduleId = null, ?string $message = null)
    {
        return UserHistory::create([
            'user_id' => $userId,
            'module_id' => $moduleId,
            'message' => $message
        ]);
    }
}
