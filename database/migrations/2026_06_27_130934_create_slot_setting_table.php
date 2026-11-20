<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('slot_setting', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id')->index()->nullable();
            $table->text('working_days')->index()->nullable();
            $table->time('start_work_time')->index()->nullable();
            $table->time('end_work_time')->index()->nullable();
            $table->time('start_break_time')->index()->nullable();
            $table->time('end_break_time')->index()->nullable();
            $table->integer('status')->nullable()->index()->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('slot_setting');
    }
};
