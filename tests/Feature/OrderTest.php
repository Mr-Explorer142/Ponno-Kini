<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('calculates order total from the database, ignoring user input prices', function () {
    $customer = User::factory()->create()->assignRole('customer');
    $category = Category::factory()->create();

    $product = Product::factory()->create([
        'category_id' => $category->id,
        'price'       => 500
    ]);

    Sanctum::actingAs($customer);

    $response = $this->postJson('/api/orders', [
        'shipping_address' => [
            'street'      => '123 Test St',
            'city'        => 'Dhaka',
            'postal_code' => '1000',
            'country'     => 'BD',
            'phone'       => '01700000000'
        ],
        'items' => [
            [
                'product_id' => $product->id,
                'quantity'   => 2,
                'price'      => 1 // Attacker tries to alter price
            ]
        ]
    ]);

    expect($response->status())->toBe(201);

    // Fetch the created order and chain property expectations
    $order = Order::where('user_id', $customer->id)->first();

    expect($order)
        ->not->toBeNull()
        ->total_amount->toBe(1000) // 2 qty * 500 DB price
        ->status->toBe('pending');
});
