<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\EmailVerificationCodeNotification;
use App\Services\EmailVerificationCodeService;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private readonly EmailVerificationCodeService $verificationCodes)
    {
    }

    public function register(Request $request)
    {

        // 1. User Registration
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
        ]);
        $user->forceFill(['verification_purpose' => 'email_verification'])->save();

        $user->assignRole('customer');

        $this->sendVerificationCode($user);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'User registered successfully. Check your email for the verification code.',
            'user' => $user,
            'access_token' => $token,
            'token_type' => 'Bearer',
            'resend_after_seconds' => 60,
        ], 201);
    }

    // 2. Login
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => 'Invalid credentials provided!',
            ]);
        }

        $user = User::where('email', $request->email)->firstOrFail();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Logged in successfully',
            'user' => $user,
            'access_token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    // 3. Authenticated User Profile
    public function me(Request $request)
    {
        return response()->json($request->user()->load('roles'));
    }

    // 4. Log out
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully!',
        ]);
    }

    // 5. Email verification code
    public function verifyEmailCode(Request $request)
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:6', 'regex:/^(?=.*[A-Z])(?=.*[0-9])[A-Z0-9]{6}$/'],
        ]);

        return DB::transaction(function () use ($request, $validated) {
            $user = User::query()->lockForUpdate()->findOrFail($request->user()->getKey());

            if ($user->hasVerifiedEmail()) {
                return response()->json(['message' => 'Email address is already verified.'], 400);
            }

            if ($user->verification_purpose && $user->verification_purpose !== 'email_verification') {
                return response()->json([
                    'message' => 'Complete the pending profile change using its verification code first.',
                ], 422);
            }

            if ($user->verification_attempts >= 5) {
                return response()->json([
                    'message' => 'Too many incorrect codes. Request a new code to try again.',
                ], 429);
            }

            if (!$user->verification_code_expires_at || $user->verification_code_expires_at->isPast()) {
                return response()->json([
                    'message' => 'This verification code has expired. Request a new code.',
                ], 422);
            }

            if (!$user->verification_code_hash || !Hash::check($validated['code'], $user->verification_code_hash)) {
                $user->increment('verification_attempts');

                return response()->json([
                    'message' => $user->verification_attempts >= 5
                        ? 'Too many incorrect codes. Request a new code to try again.'
                        : 'The verification code is incorrect.',
                    'attempts_remaining' => max(0, 5 - $user->verification_attempts),
                ], $user->verification_attempts >= 5 ? 429 : 422);
            }

            $user->forceFill([
                'email_verified_at' => now(),
                'verification_code_hash' => null,
                'verification_code_expires_at' => null,
                'verification_attempts' => 0,
                'verification_purpose' => null,
            ])->save();

            event(new Verified($user));

            return response()->json([
                'message' => 'Your email address has been verified.',
                'user' => $user,
            ]);
        });
    }

    // 6. Resending the verification code
    public function resendVerificationNotification(Request $request)
    {
        $result = DB::transaction(function () use ($request) {
            $user = User::query()->lockForUpdate()->findOrFail($request->user()->getKey());

            if ($user->hasVerifiedEmail()) {
                return ['error' => 'Email address is already verified.', 'status' => 400];
            }

            if ($user->verification_purpose && $user->verification_purpose !== 'email_verification') {
                return [
                    'error' => 'Complete the pending profile change using its verification code first.',
                    'status' => 422,
                ];
            }

            $retryAfter = $user->verification_code_sent_at
                ? max(0, 60 - (int) $user->verification_code_sent_at->diffInSeconds(now()))
                : 0;

            if ($retryAfter > 0) {
                return [
                    'error' => 'Please wait before requesting another verification code.',
                    'retry_after' => $retryAfter,
                    'status' => 429,
                ];
            }

            return [
                'user' => $user,
                'code' => $this->verificationCodes->issue($user),
            ];
        });

        if (isset($result['error'])) {
            return response()->json([
                'message' => $result['error'],
                ...isset($result['retry_after']) ? ['retry_after' => $result['retry_after']] : [],
            ], $result['status']);
        }

        $result['user']->notify(new EmailVerificationCodeNotification($result['code']));

        return response()->json([
            'message' => 'A new verification code has been sent.',
            'resend_after_seconds' => 60,
        ]);
    }

    public function verificationStatus(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'email' => $user->email,
            'verified' => $user->hasVerifiedEmail(),
            'expires_at' => $user->verification_code_expires_at,
            'resend_after_seconds' => $user->verification_code_sent_at
                ? max(0, 60 - (int) $user->verification_code_sent_at->diffInSeconds(now()))
                : 0,
            'attempts_remaining' => max(0, 5 - $user->verification_attempts),
        ]);
    }

    private function sendVerificationCode(User $user): void
    {
        $code = $this->verificationCodes->issue($user);
        $user->notify(new EmailVerificationCodeNotification($code));
    }

    // 7. Sending Reset Password Email Link
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $status = Password::sendResetLink(
            $request->only('email')
        );

        return $status === Password::RESET_LINK_SENT
            ? response()->json(['message' => __($status)])
            : response()->json(['message' => __($status)], 400);
    }

    // 8. Performing Password Reset
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token'    => 'required',
            'email'    => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password' => $password,
                ])->save();

                // Revoke tokens on password reset for security
                $user->tokens()->delete();
            }
        );

        return $status === Password::PASSWORD_RESET
            ? response()->json(['message' => __($status)])
            : response()->json(['message' => __($status)], 400);
    }
}
