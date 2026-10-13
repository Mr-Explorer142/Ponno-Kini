<?php

use App\Models\Category;
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
