<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class GenerateConfigFile extends Command
{
    protected $signature = 'config:generate';
    protected $description = 'Generate a static config file for the frontend';

    public function handle()
    {
        $config = [
            'base_url' => config('app.frontend_base_url'),
        ];

        $filePath = public_path('frontend-config.json');

        File::put($filePath, json_encode($config, JSON_PRETTY_PRINT));

        $this->info('Config file generated: ' . $filePath);
    }
}