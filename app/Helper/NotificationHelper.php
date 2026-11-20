<?php

namespace App\Helper;

use Google\Auth\Credentials\ServiceAccountCredentials;
use GuzzleHttp\Client;
use GuzzleHttp\RequestOptions;
use Illuminate\Support\Facades\Log;

class NotificationHelper
{
    public static function getAccessToken()
    {
        try {
            $keyFilePath = storage_path('app/firebase-account-settings.json');
            
            // Verify the service account file exists
            if (!file_exists($keyFilePath)) {
                Log::error('Firebase service account file not found');
                return null;
            }

            $scopes = ['https://www.googleapis.com/auth/firebase.messaging'];
            $credentials = new ServiceAccountCredentials($scopes, $keyFilePath);
            $authToken = $credentials->fetchAuthToken();

            return $authToken['access_token'] ?? null;
        } catch (\Exception $e) {
            Log::error('Failed to get access token: ' . $e->getMessage());
            return null;
        }
    }

    public static function sendNotification($deviceToken, $title, $body, $image = false)
    {
        try {
            $projectId = 'techenix-60f2a'; // Verify this matches your Firebase project ID
            $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";
            
            $accessToken = self::getAccessToken();
            if (!$accessToken) {
                Log::error('Failed to get FCM access token');
                return ['error' => 'Unable to authenticate with FCM'];
            }


            $client = new Client();
            $response = $client->post($url, [
                RequestOptions::HEADERS => [
                    'Authorization' => 'Bearer ' . $accessToken,
                    'Content-Type'  => 'application/json',
                ],
                RequestOptions::JSON => [
                    'message' => [
                        'token' => $deviceToken,
                        'data' => [  // Changed from 'data' to 'notification'
                            'title' => $title,
                            'body' => $body,
                            'image' => ($image) ? $image : ''
                        ],
                        'notification' => [  // Changed from 'data' to 'notification'
                            'title' => $title,
                            'body' => $body,
                            'image' => ($image) ? $image : ''
                        ],
                        'android' => [
                            'priority' => 'high',
                        ],
                        'apns' => [
                            'payload' => [
                                'aps' => [
                                    'sound' => 'default',
                                    'alert' => [  // Added for iOS compatibility
                                        'title' => $title,
                                        'body' => $body,
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
                RequestOptions::TIMEOUT => 10, // Added timeout
            ]);

            $responseBody = json_decode($response->getBody(), true);

            return $responseBody;
        } catch (\Exception $e) {
            Log::error('FCM notification failed', [
                'error' => $e->getMessage(),
                'deviceToken' => $deviceToken
            ]);
            return ['error' => $e->getMessage()];
        }
    }
}