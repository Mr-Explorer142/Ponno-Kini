<?php

use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Carbon\CarbonImmutable;
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

it('returns a complete empty order heatmap when there are no orders', function () {
    $admin = User::factory()->create([
        'email_verified_at' => now(),
    ])->assignRole('admin');
    Sanctum::actingAs($admin);

    $response = $this->getJson('/api/admin/stats/orders-heatmap')
        ->assertOk()
        ->assertJsonCount(168);

    expect(collect($response->json())->sum('orders'))->toBe(0);
});

it('groups valid orders into the correct weekday and hour for the heatmap', function () {
    $admin = User::factory()->create([
        'email_verified_at' => now(),
    ])->assignRole('admin');
    Sanctum::actingAs($admin);

    $createdAt = CarbonImmutable::now('Asia/Dhaka')
        ->subDay()
        ->setTime(14, 0);

    Order::factory()->create([
        'status' => 'pending',
        'payment_method' => Order::CASH_ON_DELIVERY,
        'created_at' => $createdAt,
        'updated_at' => $createdAt,
    ]);

    $this->getJson('/api/admin/stats/orders-heatmap')
        ->assertOk()
        ->assertJsonCount(168)
        ->assertJsonFragment([
            'weekday' => $createdAt->dayOfWeek,
            'hour' => 14,
            'orders' => 1,
        ]);
});

it('returns empty rating buckets when there are no reviews in the selected period', function () {
    $admin = User::factory()->create([
        'email_verified_at' => now(),
    ])->assignRole('admin');
    Sanctum::actingAs($admin);

    $this->getJson('/api/admin/stats/ratings')
        ->assertOk()
        ->assertExactJson([
            ['rating' => 1, 'count' => 0],
            ['rating' => 2, 'count' => 0],
            ['rating' => 3, 'count' => 0],
            ['rating' => 4, 'count' => 0],
            ['rating' => 5, 'count' => 0],
        ]);
});

it('counts recent reviews by rating for the dashboard', function () {
    $admin = User::factory()->create([
        'email_verified_at' => now(),
    ])->assignRole('admin');
    Sanctum::actingAs($admin);

    Review::create([
        'product_id' => Product::factory()->create()->id,
        'user_id' => User::factory()->create()->id,
        'rating' => 4,
        'comment' => 'Good product.',
    ]);

    $this->getJson('/api/admin/stats/ratings')
        ->assertOk()
        ->assertJsonFragment(['rating' => 4, 'count' => 1]);
});
