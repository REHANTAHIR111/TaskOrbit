<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SlotSetting extends Model
{
    protected $table = 'slot_setting';
    protected $guarded = [];

    public function holidays() {
        return $this->hasMany(Holiday::class, 'setting_id', 'id');
    }
}
