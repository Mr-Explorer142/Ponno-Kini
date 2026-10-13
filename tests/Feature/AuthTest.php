<?php

use App\Models\User;

it('registers a new customer successfully', function () {

    $response = $this->postJson('/api/register', [
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'password' => 'Password@123',
        'password_confirmation' => 'Password@123',
    ]);

    expect($response->status())->toBe(201)
        ->and($response->json())->toHaveKeys(['access_token', 'user.id', 'user.email']);

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
