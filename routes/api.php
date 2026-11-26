<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\TaskController;

//authentication routes
Route::post('account/registeration', [UserController::class, 'register'])->name('api.register');
Route::post('account/login', [UserController::class, 'login'])->name('api.login');
Route::post('account/logout', [UserController::class, 'logout'])->name('api.logout');
Route::post('account/forgot-password', [UserController::class, 'sendPasswordResetLink'])->name('api.password.email');
Route::post('account/reset-password', [UserController::class, 'resetPassword'])->name('api.password.update');

//task management routes
Route::post('/task/{id}/restore-preview', [TaskController::class, 'previewRestore'])->name('api.restorePreview');
Route::post('/task/{id}/schedule-preview', [TaskController::class, 'previewTaskSchedule'])->name('api.taskSchedulePreview');
Route::customResource('/task', TaskController::class);
Route::get('/getTask/{id}', [TaskController::class, 'getTask'])->name('api.getTask');
Route::get('/deleted-tasks/{id}', [TaskController::class, 'getDeletedData'])->name('api.deleted-tasks');
Route::post('/task/restore/{id}', [TaskController::class, 'restoreData'])->name('api.restoreData');
Route::post('/task/restore-multiple', [TaskController::class, 'restoreMultiData'])->name('api.restoreMultiData');
Route::get('/task/{id}/force-delete', [TaskController::class, 'taskDeletePermanant'])->name('api.taskDeletePermanant');
Route::post('/task/force-multidelete', [TaskController::class, 'taskMultiDeletePermanant'])->name('api.taskMultiDeletePermanant');

Route::get('/get_slot_setting/{id}', [TaskController::class, 'getSlotSetting'])->name('api.getSlotSetting');
Route::post('/save_slot_setting/', [TaskController::class, 'saveSlotSetting'])->name('api.saveSlotSetting');
