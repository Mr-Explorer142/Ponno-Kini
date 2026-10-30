<?php

use App\Models\User;
use App\Notifications\EmailVerificationCodeNotification;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

it('registers a new customer successfully', function () {
    Notification::fake();

    $response = $this->postJson('/api/register', [
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'password' => 'Password@123',
        'password_confirmation' => 'Password@123',
    ]);

    expect($response->status())->toBe(201)
        ->and($response->json('user.email_verified_at'))->toBeNull();

    $user = User::where('email', 'john@example.com')->firstOrFail();
    Notification::assertSentTo($user, EmailVerificationCodeNotification::class, function ($notification) {
        return preg_match('/^(?=.*[A-Z])(?=.*[0-9])[A-Z0-9]{6}$/', $notification->code) === 1;
    });
});

it('verifies a registered user with the emailed code', function () {
    $user = User::factory()->unverified()->create([
        'verification_code_hash' => Hash::make('K7M2QX'),
        'verification_code_expires_at' => now()->addMinutes(10),
    ]);

    $response = $this->actingAs($user)->postJson('/api/email/verify-code', [
        'code' => 'K7M2QX',
    ]);

    expect($response->status())->toBe(200)
        ->and($user->fresh()->hasVerifiedEmail())->toBeTrue()
        ->and($user->fresh()->verification_code_hash)->toBeNull();
});

it('locks verification after five incorrect codes', function () {
    $user = User::factory()->unverified()->create([
        'verification_code_hash' => Hash::make('K7M2QX'),
        'verification_code_expires_at' => now()->addMinutes(10),
    ]);

    for ($attempt = 1; $attempt <= 5; $attempt++) {
        $response = $this->actingAs($user)->postJson('/api/email/verify-code', [
            'code' => 'A1B2C3',
        ]);
        expect($response->status())->toBe($attempt === 5 ? 429 : 422);
    }

    expect($user->fresh()->verification_attempts)->toBe(5);
    expect($this->actingAs($user)->postJson('/api/email/verify-code', [
        'code' => 'K7M2QX',
    ])->status())->toBe(429);
});

it('rejects expired verification codes', function () {
    $user = User::factory()->unverified()->create([
        'verification_code_hash' => Hash::make('K7M2QX'),
        'verification_code_expires_at' => now()->subSecond(),
    ]);

    expect($this->actingAs($user)->postJson('/api/email/verify-code', [
        'code' => 'K7M2QX',
    ])->status())->toBe(422)
        ->and($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

it('enforces the resend cooldown', function () {
    $user = User::factory()->unverified()->create([
        'verification_code_sent_at' => now()->subSeconds(30),
    ]);

    $response = $this->actingAs($user)->postJson('/api/email/verification-notification');

    expect($response->status())->toBe(429)
        ->and($response->json('retry_after'))->toBe(30);
});

it('resends a fresh code after the cooldown', function () {
    Notification::fake();
    $user = User::factory()->unverified()->create([
        'verification_code_hash' => Hash::make('A1B2C3'),
        'verification_code_sent_at' => now()->subSeconds(61),
        'verification_attempts' => 5,
    ]);

    $response = $this->actingAs($user)->postJson('/api/email/verification-notification');
    $freshUser = $user->fresh();

    expect($response->status())->toBe(200)
        ->and($freshUser->verification_attempts)->toBe(0)
        ->and(Hash::check('A1B2C3', $freshUser->verification_code_hash))->toBeFalse();

    Notification::assertSentTo($user, EmailVerificationCodeNotification::class, function ($notification) use ($freshUser) {
        return Hash::check($notification->code, $freshUser->verification_code_hash);
    });
});

it('rejects login with invalid credentials', function () {

    $user = User::factory()->create(['password' => 'CorrectPassword']);

    $response = $this->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'WrongPassword',
    ]);

    expect($response->status())->toBe(422)
        ->and($response->json('errors'))->toHaveKey('email');
});
