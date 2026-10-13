<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('prevents a user from reviewing a product they did not buy', function () {
    $customer = User::factory()->create();
    $category = Category::factory()->create();
    $product = Product::factory()->create(['category_id' => $category->id]);

    Sanctum::actingAs($customer);

    $response = $this->postJson("/api/products/{$product->id}/reviews", [
        'rating'  => 5,
        'comment' => 'Great product!'
    ]);

    expect($response->status())->toBe(403)
        ->and($response->json('message'))->toBe('You can only review products you have purchased.');
});

it('allows a user to review a product they successfully purchased', function () {
    $customer = User::factory()->create();
    $category = Category::factory()->create();
    $product = Product::factory()->create(['category_id' => $category->id]);

    $order = Order::factory()->create([
        'user_id'        => $customer->id,
        'payment_status' => 'paid'
    ]);

    OrderItem::factory()->create([
        'order_id'   => $order->id,
        'product_id' => $product->id
    ]);

    Sanctum::actingAs($customer);

    $response = $this->postJson("/api/products/{$product->id}/reviews", [
        'rating'  => 5,
        'comment' => 'Amazing quality.'
    ]);

    expect($response->status())->toBe(201);

    // Chain expectations directly on the Eloquent model
    $review = Review::where('user_id', $customer->id)->first();

    expect($review)
        ->not->toBeNull()
        ->product_id->toBe($product->id)
        ->rating->toBe(5);
});
