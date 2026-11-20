<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // $schedule->command('chatroom:update-unassigned')->everyMinute();
        // $schedule->command('chatroom:re-assign-agent')->everyTenSeconds();
        // $schedule->command('chatroom:deactivate-chatrooms')->everyTenSeconds();
        // $schedule->command('customer:check-customer-online-time')->everySecond();
        // $schedule->command('analytics:generate')->everyThirtyMinutes();
        // $schedule->command('app:backup-database')->dailyAt('01:00');
        // $schedule->command('app:backup-database')->dailyAt('07:00');
        // $schedule->command('chat:assign-ai-agent')->everySecond();
        // $schedule->command('report-daily-email-report')->daily();
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }

    protected $commands = [
        \App\Console\Commands\GenerateConfigFile::class,
    ];
}
