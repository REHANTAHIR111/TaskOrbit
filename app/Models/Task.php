<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use SoftDeletes;

    protected $table = 'task';
    protected $guarded = [];

    protected $dates = ['deleted_at'];

    public function segments()
    {
        return $this->hasMany(TaskSegment::class, 'task_id')->orderBy('segment_date')->orderBy('sequence');
    }
}
