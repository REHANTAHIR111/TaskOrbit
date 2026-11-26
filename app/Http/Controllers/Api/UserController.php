<?php

namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Services\UserHistoryService;
use Illuminate\Http\Request;
use Hash;
use App\Models\User;
use App\Models\PasswordResetToken;
use App\Models\CompanyLanguages;
use App\Models\Company;
use App\Models\PersonalAccessToken;
use App\Models\Language;
use App\Models\CompanyAnalytics;
use Mail;
use Carbon\Carbon;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Password;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Validator;
use Log;
class UserController extends Controller
{

    public function register(Request $request)
    {
            $validator = Validator::make($request->all(),
            [
                'first_name'=>'required|string|max:255',
                'last_name'=>'required|string|max:255',
                'phone_number'=>'required|string|max:20',
                'email'=>'required|email|unique:users',
                'password'=>'required|string|min:6'
            ]
        );

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $user = User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'phone_number' => $request->phone_number,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        return response()->json([
            'status' => 'success',
        ]);

    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
            'password' => 'required',
        ]);
        $password = $request->password;

        $user = User::where('email', $request->email)->first();
        
        if (!$user || !Hash::check(trim($password), $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials',
            ], 200);
        }
        $userData = [
            'id' => $user->id,
            'name' => "{$user->first_name} {$user->last_name}",
            'email' => $user->email,
            'phone_number' => $user->phone_number,
        ];

       
        return response()->json([
            'success' => true,
            'user_data' => $userData,
            'message' => 'You Are Successfully Logged In!',
        ]);
    }


    public function sendPasswordResetLink(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        try {
            Password::sendResetLink($request->only('email'));

            // Keep the response generic so account existence is not disclosed.
            return response()->json([
                'success' => true,
                'message' => 'If an account exists for that email, a password reset link will be sent shortly.',
            ]);
        } catch (\Throwable $exception) {
            Log::warning('Password reset email could not be sent.');
            return response()->json([
                'success' => false,
                'message' => 'We could not send a reset link right now. Please try again later.',
            ], 503);
        }
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => [
                'required',
                'confirmed',
                'string',
                'min:6',
                'max:16',
                'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{6,16}$/',
            ],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'success' => true,
                'message' => 'Your password has been updated. You can now sign in.',
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'This password reset link is invalid or has expired. Request a new link and try again.',
        ], 422);
    }

    public function customLogout(Request $request)
    {
        $userId = $request->user_id;
        $tokenId = $request->token_id;
        $user = User::where('id', $userId)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User is not authenticated.'
            ]);
        }

        // Revoke only current token
        PersonalAccessToken::where('id', $tokenId)
                            ->where('tokenable_id', $userId)
                            ->delete();
        // Clear token and session info
        $user->update([
            'token' => null,
            'token_expiry' => null,
            'online_status' => 0,
            'notification_token' => null,
        ]);

        // Log history
        $this->userHistoryService->StoreUserHistory(
            $user->id,
            null,
            'User logged out'
        );

        return response()->json([
            'success' => true,
            'message' => 'User logged out successfully'
        ]);
    }

}
