<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('allows public users to list products', function () {
    $category = Category::factory()->create();
    Product::factory(3)->create(['category_id' => $category->id]);

    $response = $this->getJson('/api/products');

    expect($response->status())->toBe(200)
        ->and($response->json('data'))->toHaveCount(3);
});

it('ranks best sellers by quantities in paid orders only', function () {
    $category = Category::factory()->create();
    $popularProduct = Product::factory()->create(['category_id' => $category->id]);
    $pendingProduct = Product::factory()->create(['category_id' => $category->id]);
    $customer = User::factory()->create();

    $paidOrder = Order::factory()->create([
        'user_id' => $customer->id,
        'payment_status' => 'paid',
    ]);
    $pendingOrder = Order::factory()->create([
        'user_id' => $customer->id,
        'payment_status' => 'pending',
    ]);

    OrderItem::factory()->create([
        'order_id' => $paidOrder->id,
        'product_id' => $popularProduct->id,
        'quantity' => 3,
    ]);
    OrderItem::factory()->create([
        'order_id' => $pendingOrder->id,
        'product_id' => $pendingProduct->id,
        'quantity' => 100,
    ]);

    $response = $this->getJson('/api/products?sort=best_selling');

    expect($response->status())->toBe(200)
        ->and($response->json('data.0.id'))->toBe($popularProduct->id)
        ->and($response->json('data.1.id'))->toBe($pendingProduct->id);
});

it('blocks a customer from creating a product', function () {
    $customer = User::factory()->create()->assignRole('customer');
    Sanctum::actingAs($customer);

    $response = $this->postJson('/api/products', [
        'name'        => 'Hacked Product',
        'description' => 'Test',
        'price'       => 1000,
        'category_id' => 1,
    ]);

    expect($response->status())->toBe(403);
});

it('allows an admin to create a product', function () {
    $admin = User::factory()->create()->assignRole('admin');
    $category = Category::factory()->create();
    Sanctum::actingAs($admin);

    $response = $this->postJson('/api/products', [
        'name'        => 'Mechanical Keyboard',
        'description' => 'A great keyboard',
        'price'       => 12000,
        'category_id' => $category->id,
    ]);

    expect($response->status())->toBe(201)
        ->and($response->json('name'))->toBe('Mechanical Keyboard')
        ->and(Product::where('slug', 'mechanical-keyboard')->exists())->toBeTrue();

});
