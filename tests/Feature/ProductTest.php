<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;

it('allows public users to list products', function () {
    $category = Category::factory()->create();
    Product::factory(33)->create(['category_id' => $category->id]);

    $response = $this->getJson('/api/products');
    $secondPage = $this->getJson('/api/products?page=2');
    $thirdPage = $this->getJson('/api/products?page=3');

    expect($response->status())->toBe(200)
        ->and($response->json('data'))->toHaveCount(16)
        ->and($response->json('meta.per_page'))->toBe(16)
        ->and($response->json('meta.last_page'))->toBe(3)
        ->and($secondPage->json('data'))->toHaveCount(16)
        ->and($thirdPage->json('data'))->toHaveCount(1);
});

it('loads product details from the database instead of stale cached model data', function () {
    $category = Category::factory()->create();
    $product = Product::factory()->create([
        'category_id' => $category->id,
        'name' => 'First catalog product',
    ]);

    Cache::put("products.show.{$product->id}", ['id' => 999], 3600);

    $response = $this->getJson("/api/product/{$product->id}");

    $response->assertOk()
        ->assertJsonPath('data.id', $product->id)
        ->assertJsonPath('data.name', 'First catalog product');
});

it('returns Gemini-selected recommendations for a product without recommending itself', function () {
    $category = Category::factory()->create();
    $product = Product::factory()->create(['category_id' => $category->id]);
    $recommended = Product::factory()->create(['category_id' => $category->id]);
    Product::factory()->create(['category_id' => $category->id]);
    config(['services.gemini.key' => 'test-key']);

    Http::fake([
        'generativelanguage.googleapis.com/*' => Http::response([
            'candidates' => [[
                'content' => [
                    'parts' => [[
                        'text' => json_encode([
                            'product_ids' => [$product->id, $recommended->id],
                        ]),
                    ]],
                ],
            ]],
        ]),
    ]);

    $response = $this->postJson("/api/products/{$product->id}/recommendations");

    expect($response->status())->toBe(200)
        ->and($response->json('data'))->toHaveCount(1)
        ->and($response->json('data.0.id'))->toBe($recommended->id);
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
        'name' => 'Hacked Product',
        'description' => 'Test',
        'price' => 1000,
        'category_id' => 1,
    ]);

    expect($response->status())->toBe(403);
});

it('allows an admin to create a product', function () {
    $admin = User::factory()->create()->assignRole('admin');
    $category = Category::factory()->create();
    Sanctum::actingAs($admin);

    $response = $this->postJson('/api/products', [
        'name' => 'Mechanical Keyboard',
        'description' => 'A great keyboard',
        'price' => 12000,
        'category_id' => $category->id,
    ]);

    expect($response->status())->toBe(201)
        ->and($response->json('name'))->toBe('Mechanical Keyboard')
        ->and(Product::where('slug', 'mechanical-keyboard')->exists())->toBeTrue();

});
