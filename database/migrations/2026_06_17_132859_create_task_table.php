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
        Schema::create('task', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id')->index()->nullable();
            $table->string('task_name')->index()->nullable();
            $table->integer('hour')->index()->nullable();
            $table->date('start_date')->index()->nullable();
            $table->date('end_date')->index()->nullable();
            $table->time('start_time')->index()->nullable();
            $table->time('end_time')->index()->nullable();
            $table->text('description')->nullable()->index()->nullable();
            $table->string('priority')->index()->nullable();
            $table->boolean('status')->default(0)->index();
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task');
    }
};
