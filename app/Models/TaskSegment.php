<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskSegment extends Model
{
    protected $table = 'task_segments';

    protected $guarded = [];

    protected $casts = [
        'segment_date' => 'date:Y-m-d',
        'allocated_minutes' => 'integer',
        'sequence' => 'integer',
    ];

    public function task()
    {
        return $this->belongsTo(Task::class, 'task_id');
    }
}
