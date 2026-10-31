<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;

it('updates the authenticated user name', function () {
    $user = User::factory()->create();
    Sanctum::actingAs($user);

    $this->patchJson('/api/profile', ['name' => 'Updated Name'])
        ->assertOk()
        ->assertJsonPath('user.name', 'Updated Name');

    expect($user->fresh()->name)->toBe('Updated Name');
});

it('updates an email only after verifying a code sent to the new address', function () {
    Notification::fake();

    $user = User::factory()->create(['password' => 'current-password']);
    Sanctum::actingAs($user);

    $this->postJson('/api/profile/email/request', [
        'email' => 'new-address@example.com',
        'current_password' => 'current-password',
    ])->assertOk();

    $user->forceFill([
        'verification_code_hash' => Hash::make('K7M2QX'),
        'verification_code_expires_at' => now()->addMinutes(10),
    ])->save();

    $this->postJson('/api/profile/email/verify', ['code' => 'K7M2QX'])
        ->assertOk()
        ->assertJsonPath('user.email', 'new-address@example.com')
        ->assertJsonMissingPath('user.verification_code_hash');

    expect($user->fresh()->email)->toBe('new-address@example.com')
        ->and($user->fresh()->hasVerifiedEmail())->toBeTrue()
        ->and($user->fresh()->pending_email)->toBeNull();
});

it('updates a password only after verifying the emailed code', function () {
    Notification::fake();

    $user = User::factory()->create(['password' => 'current-password']);
    Sanctum::actingAs($user);

    $this->postJson('/api/profile/password/request', [
        'current_password' => 'current-password',
        'new_password' => 'new-password-123',
        'new_password_confirmation' => 'new-password-123',
    ])->assertOk();

    $user->forceFill([
        'verification_code_hash' => Hash::make('K7M2QX'),
        'verification_code_expires_at' => now()->addMinutes(10),
    ])->save();

    $this->postJson('/api/profile/password/verify', ['code' => 'K7M2QX'])
        ->assertOk();

    expect(Hash::check('new-password-123', $user->fresh()->password))->toBeTrue()
        ->and($user->fresh()->pending_password_hash)->toBeNull();
});

it('rejects a profile verification code from another flow', function () {
    $user = User::factory()->create();
    $user->forceFill([
        'pending_email' => 'new-address@example.com',
        'verification_purpose' => 'email_change',
        'verification_code_hash' => Hash::make('K7M2QX'),
        'verification_code_expires_at' => now()->addMinutes(10),
    ])->save();
    Sanctum::actingAs($user);

    $this->postJson('/api/profile/password/verify', ['code' => 'K7M2QX'])
        ->assertUnprocessable();

    expect($user->fresh()->email)->not->toBe('new-address@example.com');
});

it('resends a code for a pending email change after the cooldown', function () {
    Notification::fake();

    $user = User::factory()->create();
    $user->forceFill([
        'pending_email' => 'new-address@example.com',
        'verification_purpose' => 'email_change',
        'verification_code_sent_at' => now()->subSeconds(61),
    ])->save();
    Sanctum::actingAs($user);

    $this->postJson('/api/profile/email/resend')->assertOk();

    expect($user->fresh()->verification_code_sent_at->isToday())->toBeTrue();
});
