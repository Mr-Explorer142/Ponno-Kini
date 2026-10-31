<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\EmailVerificationCodeNotification;
use App\Services\EmailVerificationCodeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class ProfileController extends Controller
{
    public function __construct(private readonly EmailVerificationCodeService $verificationCodes)
    {
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $request->user()->update($validated);

        return response()->json(['user' => $request->user()->fresh()->load('roles')]);
    }

    public function requestEmailChange(Request $request)
    {
        $user = $request->user();
        $rules = [
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->getKey()),
            ],
        ];

        if (! $user->provider) {
            $rules['current_password'] = ['required', 'string'];
        }

        $validated = $request->validate($rules);

        if (isset($validated['current_password']) && ! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => 'The current password is incorrect.',
            ]);
        }

        if ($validated['email'] === $user->email) {
            throw ValidationException::withMessages([
                'email' => 'This is already your current email address.',
            ]);
        }

        $result = DB::transaction(function () use ($user, $validated) {
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->getKey());
            $retryAfter = $this->resendAfter($lockedUser);

            if ($retryAfter > 0) {
                return ['retry_after' => $retryAfter];
            }

            $lockedUser->forceFill([
                'pending_email' => $validated['email'],
                'pending_password_hash' => null,
                'verification_purpose' => 'email_change',
            ])->save();

            return [
                'code' => $this->verificationCodes->issue($lockedUser),
                'user' => $lockedUser,
            ];
        });

        if (isset($result['retry_after'])) {
            return response()->json([
                'message' => 'Please wait before requesting another verification code.',
                'retry_after' => $result['retry_after'],
            ], 429);
        }

        Notification::route('mail', $validated['email'])
            ->notify(new EmailVerificationCodeNotification($result['code']));

        return response()->json([
            'message' => 'A verification code has been sent to your new email address.',
            'resend_after_seconds' => 60,
        ]);
    }

    public function verifyEmailChange(Request $request)
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:6', 'regex:/^(?=.*[A-Z])(?=.*[0-9])[A-Z0-9]{6}$/'],
        ]);

        $result = DB::transaction(function () use ($request, $validated) {
            $user = User::query()->lockForUpdate()->findOrFail($request->user()->getKey());

            if ($user->verification_purpose !== 'email_change' || ! $user->pending_email) {
                return ['error' => 'There is no pending email change to verify.', 'status' => 422];
            }

            if ($error = $this->verificationCodeError($user, $validated['code'])) {
                return $error;
            }

            if (User::query()
                ->where('email', $user->pending_email)
                ->whereKeyNot($user->getKey())
                ->exists()) {
                return ['error' => 'This email address is already in use.', 'status' => 422];
            }

            $user->forceFill([
                'email' => $user->pending_email,
                'email_verified_at' => now(),
                'pending_email' => null,
            ]);
            $this->clearVerificationCode($user);
            $user->save();

            return ['user' => $user->load('roles')];
        });

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], $result['status']);
        }

        return response()->json([
            'message' => 'Your email address has been updated and verified.',
            'user' => $result['user'],
        ]);
    }

    public function resendEmailChangeCode(Request $request)
    {
        return $this->resendProfileChangeCode($request, 'email_change');
    }

    public function requestPasswordChange(Request $request)
    {
        $user = $request->user();
        $rules = [
            'new_password' => ['required', 'string', 'min:8', 'confirmed'],
        ];

        if (! $user->provider) {
            $rules['current_password'] = ['required', 'string'];
        }

        $validated = $request->validate($rules);

        if (isset($validated['current_password']) && ! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => 'The current password is incorrect.',
            ]);
        }

        $result = DB::transaction(function () use ($user, $validated) {
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->getKey());
            $retryAfter = $this->resendAfter($lockedUser);

            if ($retryAfter > 0) {
                return ['retry_after' => $retryAfter];
            }

            $lockedUser->forceFill([
                'pending_email' => null,
                'pending_password_hash' => Hash::make($validated['new_password']),
                'verification_purpose' => 'password_change',
            ])->save();

            return [
                'code' => $this->verificationCodes->issue($lockedUser),
                'user' => $lockedUser,
            ];
        });

        if (isset($result['retry_after'])) {
            return response()->json([
                'message' => 'Please wait before requesting another verification code.',
                'retry_after' => $result['retry_after'],
            ], 429);
        }

        $result['user']->notify(new EmailVerificationCodeNotification($result['code']));

        return response()->json([
            'message' => 'A verification code has been sent to your email address.',
            'resend_after_seconds' => 60,
        ]);
    }

    public function verifyPasswordChange(Request $request)
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:6', 'regex:/^(?=.*[A-Z])(?=.*[0-9])[A-Z0-9]{6}$/'],
        ]);

        $result = DB::transaction(function () use ($request, $validated) {
            $user = User::query()->lockForUpdate()->findOrFail($request->user()->getKey());

            if ($user->verification_purpose !== 'password_change' || ! $user->pending_password_hash) {
                return ['error' => 'There is no pending password change to verify.', 'status' => 422];
            }

            if ($error = $this->verificationCodeError($user, $validated['code'])) {
                return $error;
            }

            $user->forceFill(['password' => $user->pending_password_hash]);
            $user->pending_password_hash = null;
            $this->clearVerificationCode($user);
            $user->save();

            $currentToken = $request->user()->currentAccessToken();
            if ($currentToken instanceof PersonalAccessToken) {
                $user->tokens()->where('id', '!=', $currentToken->getKey())->delete();
            }

            return ['user' => $user];
        });

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], $result['status']);
        }

        return response()->json(['message' => 'Your password has been updated.']);
    }

    public function resendPasswordChangeCode(Request $request)
    {
        return $this->resendProfileChangeCode($request, 'password_change');
    }

    private function resendProfileChangeCode(Request $request, string $purpose)
    {
        $result = DB::transaction(function () use ($request, $purpose) {
            $user = User::query()->lockForUpdate()->findOrFail($request->user()->getKey());
            $hasPendingChange = $purpose === 'email_change'
                ? (bool) $user->pending_email
                : (bool) $user->pending_password_hash;

            if ($user->verification_purpose !== $purpose || ! $hasPendingChange) {
                return ['error' => 'There is no pending change to verify.', 'status' => 422];
            }

            $retryAfter = $this->resendAfter($user);
            if ($retryAfter > 0) {
                return [
                    'error' => 'Please wait before requesting another verification code.',
                    'retry_after' => $retryAfter,
                    'status' => 429,
                ];
            }

            return [
                'code' => $this->verificationCodes->issue($user),
                'user' => $user,
            ];
        });

        if (isset($result['error'])) {
            return response()->json([
                'message' => $result['error'],
                ...isset($result['retry_after']) ? ['retry_after' => $result['retry_after']] : [],
            ], $result['status']);
        }

        $notification = new EmailVerificationCodeNotification($result['code']);
        if ($purpose === 'email_change') {
            Notification::route('mail', $result['user']->pending_email)->notify($notification);
        } else {
            $result['user']->notify($notification);
        }

        return response()->json([
            'message' => 'A new verification code has been sent.',
            'resend_after_seconds' => 60,
        ]);
    }

    private function verificationCodeError(User $user, string $code): ?array
    {
        if ($user->verification_attempts >= 5) {
            return [
                'error' => 'Too many incorrect codes. Request a new code to try again.',
                'status' => 429,
            ];
        }

        if (! $user->verification_code_expires_at || $user->verification_code_expires_at->isPast()) {
            return [
                'error' => 'This verification code has expired. Request a new code.',
                'status' => 422,
            ];
        }

        if (! $user->verification_code_hash || ! Hash::check($code, $user->verification_code_hash)) {
            $user->increment('verification_attempts');

            return [
                'error' => $user->verification_attempts >= 5
                    ? 'Too many incorrect codes. Request a new code to try again.'
                    : 'The verification code is incorrect.',
                'status' => $user->verification_attempts >= 5 ? 429 : 422,
            ];
        }

        return null;
    }

    private function clearVerificationCode(User $user): void
    {
        $user->forceFill([
            'verification_code_hash' => null,
            'verification_code_expires_at' => null,
            'verification_code_sent_at' => null,
            'verification_attempts' => 0,
            'verification_purpose' => null,
        ]);
    }

    private function resendAfter(User $user): int
    {
        return $user->verification_code_sent_at
            ? max(0, 60 - (int) $user->verification_code_sent_at->diffInSeconds(now()))
            : 0;
    }
}
