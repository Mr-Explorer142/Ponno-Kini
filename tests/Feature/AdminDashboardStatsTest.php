<?php

use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('requires authentication to access admin dashboard statistics', function () {
    $this->getJson('/api/admin/stats/summary')->assertUnauthorized();
});

it('denies customers access to admin dashboard statistics', function () {
    $customer = User::factory()->create([
        'email_verified_at' => now(),
    ])->assignRole('customer');
    Sanctum::actingAs($customer);

    $this->getJson('/api/admin/stats/summary')->assertForbidden();
});

it('rejects unsupported dashboard statistics ranges', function () {
    $admin = User::factory()->create([
        'email_verified_at' => now(),
    ])->assignRole('admin');
    Sanctum::actingAs($admin);

    $this->getJson('/api/admin/stats/summary?days=14')
        ->assertUnprocessable()
        ->assertJsonValidationErrors('days');
});
