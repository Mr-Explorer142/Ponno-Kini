<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Question;
use App\Models\User;
use App\Notifications\EmailVerificationCodeNotification;
use App\Services\ImageService;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;

it('denies admin workspace data to a customer', function () {
    Sanctum::actingAs(User::factory()->create()->assignRole('customer'));

    $this->getJson('/api/admin/dashboard')->assertForbidden();
    $this->getJson('/api/admin/products')->assertForbidden();
});

it('allows admins to create users with a role and an initial password', function () {
    Notification::fake();
    $admin = User::factory()->create()->assignRole('admin');
    Sanctum::actingAs($admin);

    $response = $this->postJson('/api/admin/users', [
        'name' => 'New Store Customer',
        'email' => 'new-customer@example.com',
        'role' => 'customer',
        'password' => 'InitialPass@123',
        'password_confirmation' => 'InitialPass@123',
    ])->assertCreated()
        ->assertJsonPath('user.name', 'New Store Customer')
        ->assertJsonPath('user.roles.0', 'customer')
        ->assertJsonPath('user.email_verified_at', null)
        ->assertJsonMissingPath('user.password');

    $user = User::where('email', 'new-customer@example.com')->firstOrFail();
    expect(Hash::check('InitialPass@123', $user->password))->toBeTrue()
        ->and($user->hasVerifiedEmail())->toBeFalse();

    Notification::assertSentTo($user, EmailVerificationCodeNotification::class);
});

it('allows admins to create another admin and rejects unsupported roles or duplicate emails', function () {
    $admin = User::factory()->create()->assignRole('admin');
    Sanctum::actingAs($admin);

    $this->postJson('/api/admin/users', [
        'name' => 'New Administrator',
        'email' => 'new-admin@example.com',
        'role' => 'admin',
        'password' => 'InitialPass@123',
        'password_confirmation' => 'InitialPass@123',
    ])->assertCreated()
        ->assertJsonPath('user.roles.0', 'admin');

    $this->postJson('/api/admin/users', [
        'name' => 'Invalid Role',
        'email' => 'invalid-role@example.com',
        'role' => 'superadmin',
        'password' => 'InitialPass@123',
        'password_confirmation' => 'InitialPass@123',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('role');

    $this->postJson('/api/admin/users', [
        'name' => 'Duplicate Email',
        'email' => 'new-admin@example.com',
        'role' => 'customer',
        'password' => 'InitialPass@123',
        'password_confirmation' => 'InitialPass@123',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

it('allows an admin to verify a new user with the emailed one-time code', function () {
    $admin = User::factory()->create()->assignRole('admin');
    $user = User::factory()->unverified()->create()->assignRole('customer');
    $user->forceFill([
        'verification_purpose' => 'email_verification',
        'verification_code_hash' => Hash::make('A1B2C3'),
        'verification_code_expires_at' => now()->addMinutes(10),
        'verification_attempts' => 0,
    ])->save();
    Sanctum::actingAs($admin);

    $this->postJson("/api/admin/users/{$user->id}/verify-email", [
        'code' => 'A1B2C3',
    ])->assertOk()
        ->assertJsonPath('user.id', $user->id)
        ->assertJsonPath('user.roles.0', 'customer')
        ->assertJsonStructure(['user' => ['email_verified_at']]);

    expect($user->fresh()->hasVerifiedEmail())->toBeTrue()
        ->and($user->fresh()->verification_code_hash)->toBeNull()
        ->and($user->fresh()->verification_purpose)->toBeNull()
        ->and($user->fresh()->verification_attempts)->toBe(0);
});

it('rejects invalid admin email verification codes and counts attempts', function () {
    $admin = User::factory()->create()->assignRole('admin');
    $user = User::factory()->unverified()->create();
    $user->forceFill([
        'verification_purpose' => 'email_verification',
        'verification_code_hash' => Hash::make('A1B2C3'),
        'verification_code_expires_at' => now()->addMinutes(10),
        'verification_attempts' => 0,
    ])->save();
    Sanctum::actingAs($admin);

    $this->postJson("/api/admin/users/{$user->id}/verify-email", [
        'code' => 'B2C3D4',
    ])->assertUnprocessable()
        ->assertJsonPath('message', 'The verification code is incorrect.');

    expect($user->fresh()->verification_attempts)->toBe(1)
        ->and($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

it('returns dashboard metrics and low-stock products to an admin', function () {
    $admin = User::factory()->create()->assignRole('admin');
    $customer = User::factory()->create()->assignRole('customer');
    $category = Category::factory()->create();
    $lowStock = Product::factory()->create([
        'category_id' => $category->id,
        'name' => 'Nearly sold out',
        'stock' => 3,
    ]);
    Product::factory()->create([
        'category_id' => $category->id,
        'stock' => 10,
    ]);

    Order::factory()->create([
        'user_id' => $customer->id,
        'status' => 'pending',
        'payment_status' => 'paid',
        'total_amount' => 1200,
    ]);

    Sanctum::actingAs($admin);

    $this->getJson('/api/admin/dashboard')
        ->assertOk()
        ->assertJsonPath('today_orders', 1)
        ->assertJsonPath('pending_orders', 1)
        ->assertJsonPath('total_sales', 1200)
        ->assertJsonPath('low_stock_count', 1)
        ->assertJsonPath('low_stock_products.0.id', $lowStock->id);
});

it('supports searching and filtering products in the admin catalog', function () {
    $admin = User::factory()->create()->assignRole('admin');
    $category = Category::factory()->create();
    $match = Product::factory()->create([
        'category_id' => $category->id,
        'name' => 'Low stock notebook',
        'stock' => 2,
    ]);
    Product::factory()->create([
        'category_id' => $category->id,
        'name' => 'In stock notebook',
        'stock' => 20,
    ]);

    Sanctum::actingAs($admin);

    $this->getJson('/api/admin/products?search=notebook&stock=low')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $match->id)
        ->assertJsonPath('data.0.stock', 2);
});

it('allows admins to set product stock during create and edit', function () {
    $admin = User::factory()->create()->assignRole('admin');
    $category = Category::factory()->create();
    Sanctum::actingAs($admin);

    $created = $this->postJson('/api/products', [
        'name' => 'Inventory-tracked product',
        'description' => 'A product with managed stock.',
        'price' => 750,
        'stock' => 18,
        'category_id' => $category->id,
    ])->assertCreated()
        ->assertJsonPath('stock', 18);

    $productId = $created->json('id');

    $this->postJson("/api/products/{$productId}", [
        'stock' => 4,
    ])->assertOk()
        ->assertJsonPath('updated_product.stock', 4);
});

it('generates product images with the configured Gemini image model', function () {
    $admin = User::factory()->create()->assignRole('admin');
    Sanctum::actingAs($admin);
    config([
        'services.gemini.key' => 'test-key',
        'services.gemini.image_model' => 'gemini-nano-banana-2.1',
    ]);

    Http::fake([
        'generativelanguage.googleapis.com/v1beta/interactions' => Http::response([
            'steps' => [[
                'type' => 'model_output',
                'content' => [[
                    'type' => 'image',
                    'mime_type' => 'image/png',
                    'data' => base64_encode('generated image bytes'),
                ]],
            ]],
        ]),
    ]);

    $this->postJson('/api/ai/generate-image', [
        'product_name' => 'Blue ceramic mug',
        'description' => 'Handmade ceramic coffee mug.',
    ])->assertOk()
        ->assertJsonPath('mime_type', 'image/png')
        ->assertJsonPath('image', base64_encode('generated image bytes'));

    Http::assertSent(fn (ClientRequest $request) => $request->url() === 'https://generativelanguage.googleapis.com/v1beta/interactions'
        && $request['model'] === 'gemini-nano-banana-2.1'
        && str_contains($request['input'][0]['text'], 'Blue ceramic mug'));
});

it('allows admins to remove the current product image', function () {
    $admin = User::factory()->create()->assignRole('admin');
    $product = Product::factory()->create([
        'image_path' => 'products/current-image',
    ]);
    $images = Mockery::mock(ImageService::class);
    $images->shouldReceive('delete')->once()->with('products/current-image');
    app()->instance(ImageService::class, $images);
    Sanctum::actingAs($admin);

    $this->postJson("/api/products/{$product->id}", [
        'remove_image' => true,
    ])->assertOk()
        ->assertJsonPath('updated_product.image_url', null);

    expect($product->fresh()->image_path)->toBeNull();
});

it('prevents deleting categories that still contain products', function () {
    $admin = User::factory()->create()->assignRole('admin');
    $category = Category::factory()->create();
    Product::factory()->create(['category_id' => $category->id]);
    Sanctum::actingAs($admin);

    $this->deleteJson("/api/categories/{$category->id}")
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Move or delete this category’s products before deleting the category.');

    expect(Category::whereKey($category->id)->exists())->toBeTrue();
});

it('lets admins inspect orders and update their status', function () {
    $admin = User::factory()->create()->assignRole('admin');
    $customer = User::factory()->create();
    $order = Order::factory()->for($customer)->create([
        'status' => 'pending',
        'payment_status' => 'paid',
    ]);
    Sanctum::actingAs($admin);

    $this->getJson('/api/admin/orders')
        ->assertOk()
        ->assertJsonPath('data.0.id', $order->id)
        ->assertJsonPath('data.0.user.email', $customer->email);

    $this->getJson("/api/admin/orders/{$order->id}")
        ->assertOk()
        ->assertJsonPath('id', $order->id)
        ->assertJsonPath('payment_status', 'paid');

    $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'processing'])
        ->assertOk()
        ->assertJsonPath('order.status', 'processing');
});

it('allows admins to create orders using catalog prices and pending payment', function () {
    $admin = User::factory()->create()->assignRole('admin');
    $customer = User::factory()->create()->assignRole('customer');
    $firstProduct = Product::factory()->create([
        'price' => 450,
        'discount_price' => 400,
    ]);
    $secondProduct = Product::factory()->create(['price' => 300]);
    Sanctum::actingAs($admin);

    $response = $this->postJson('/api/admin/orders', [
        'user_id' => $customer->id,
        'payment_method' => 'online',
        'delivery_charge' => 120,
        'shipping_address' => [
            'street' => '12 Main Road',
            'city' => 'Chattogram',
            'postal_code' => '4000',
            'country' => 'Bangladesh',
            'phone' => '01700000000',
        ],
        'items' => [
            ['product_id' => $firstProduct->id, 'quantity' => 2],
            ['product_id' => $secondProduct->id, 'quantity' => 1],
        ],
    ])->assertCreated()
        ->assertJsonPath('user_id', $customer->id)
        ->assertJsonPath('status', 'pending')
        ->assertJsonPath('payment_status', 'pending')
        ->assertJsonPath('delivery_charge', 120)
        ->assertJsonPath('total_amount', 1220)
        ->assertJsonPath('discount_amount', 100)
        ->assertJsonPath('items.0.unit_price', 400)
        ->assertJsonPath('items.0.subtotal', 800);

    $order = Order::findOrFail($response->json('id'));
    expect($order->items)->toHaveCount(2)
        ->and($order->payment_method)->toBe('online')
        ->and($order->stock_reserved)->toBeTrue()
        ->and($firstProduct->fresh()->stock)->toBe(1)
        ->and($secondProduct->fresh()->stock)->toBe(2)
        ->and($order->payments)->toBeEmpty();
});

it('allows admins to edit order details without changing payment records or payment status', function () {
    $admin = User::factory()->create()->assignRole('admin');
    $originalCustomer = User::factory()->create()->assignRole('customer');
    $newCustomer = User::factory()->create()->assignRole('customer');
    $oldProduct = Product::factory()->create(['price' => 500]);
    $newProduct = Product::factory()->create(['price' => 800]);
    $order = Order::factory()->for($originalCustomer)->create([
        'total_amount' => 600,
        'delivery_charge' => 100,
        'payment_status' => 'paid',
    ]);
    $order->items()->create([
        'product_id' => $oldProduct->id,
        'quantity' => 1,
        'unit_price' => 500,
        'subtotal' => 500,
    ]);
    $payment = Payment::create([
        'order_id' => $order->id,
        'transaction_id' => 'admin-edit-payment-'.$order->id,
        'amount' => 600,
        'currency' => 'BDT',
        'status' => 'paid',
    ]);
    Sanctum::actingAs($admin);

    $this->putJson("/api/admin/orders/{$order->id}", [
        'user_id' => $newCustomer->id,
        'status' => 'processing',
        'delivery_charge' => 70,
        'shipping_address' => [
            'street' => '4 Lake View',
            'city' => 'Dhaka',
            'postal_code' => '1205',
            'country' => 'BD',
            'phone' => '01800000000',
        ],
        'items' => [
            ['product_id' => $newProduct->id, 'quantity' => 2],
        ],
    ])->assertOk()
        ->assertJsonPath('user_id', $newCustomer->id)
        ->assertJsonPath('status', 'processing')
        ->assertJsonPath('payment_status', 'paid')
        ->assertJsonPath('total_amount', 1670)
        ->assertJsonPath('items.0.unit_price', 800)
        ->assertJsonPath('items.0.subtotal', 1600);

    $order->refresh();
    expect($order->user_id)->toBe($newCustomer->id)
        ->and($order->payment_status)->toBe('paid')
        ->and($order->stock_reserved)->toBeTrue()
        ->and($order->items)->toHaveCount(1)
        ->and($order->items->first()->product_id)->toBe($newProduct->id)
        ->and($newProduct->fresh()->stock)->toBe(1)
        ->and($order->payments()->first()->id)->toBe($payment->id)
        ->and($order->payments()->first()->amount)->toBe(600);
});

it('releases reserved product stock when an admin cancels an order and reserves it again on reopening', function () {
    $admin = User::factory()->create()->assignRole('admin');
    $customer = User::factory()->create()->assignRole('customer');
    $product = Product::factory()->create(['stock' => 3]);
    Sanctum::actingAs($admin);

    $order = $this->postJson('/api/admin/orders', [
        'user_id' => $customer->id,
        'payment_method' => 'cod',
        'delivery_charge' => 70,
        'shipping_address' => [
            'street' => '12 Main Road',
            'city' => 'Dhaka',
            'postal_code' => '1205',
            'country' => 'Bangladesh',
            'phone' => '01700000000',
        ],
        'items' => [['product_id' => $product->id, 'quantity' => 2]],
    ])->assertCreated();

    $orderId = $order->json('id');
    expect($product->fresh()->stock)->toBe(1);

    $this->patchJson("/api/orders/{$orderId}/status", ['status' => 'cancelled'])
        ->assertOk();
    expect($product->fresh()->stock)->toBe(3)
        ->and(Order::findOrFail($orderId)->stock_reserved)->toBeFalse();

    $this->patchJson("/api/orders/{$orderId}/status", ['status' => 'pending'])
        ->assertOk();
    expect($product->fresh()->stock)->toBe(1)
        ->and(Order::findOrFail($orderId)->stock_reserved)->toBeTrue();
});

it('rejects admin order creation with non-customer accounts or client-supplied payment totals', function () {
    $admin = User::factory()->create()->assignRole('admin');
    $otherAdmin = User::factory()->create()->assignRole('admin');
    $product = Product::factory()->create();
    Sanctum::actingAs($admin);

    $payload = [
        'user_id' => $otherAdmin->id,
        'delivery_charge' => 70,
        'shipping_address' => [
            'street' => '12 Main Road',
            'city' => 'Dhaka',
            'postal_code' => '1205',
            'country' => 'Bangladesh',
            'phone' => '01700000000',
        ],
        'items' => [['product_id' => $product->id, 'quantity' => 1]],
    ];

    $this->postJson('/api/admin/orders', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('user_id');

    $payload['user_id'] = User::factory()->create()->assignRole('customer')->id;
    $payload['payment_status'] = 'paid';
    $this->postJson('/api/admin/orders', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('payment_status');
});

it('lists unanswered customer questions and allows an admin to answer them', function () {
    $admin = User::factory()->create()->assignRole('admin');
    $customer = User::factory()->create();
    $product = Product::factory()->create();
    $question = Question::create([
        'product_id' => $product->id,
        'user_id' => $customer->id,
        'question' => 'Is this available in another color?',
    ]);
    Sanctum::actingAs($admin);

    $this->getJson('/api/admin/questions')
        ->assertOk()
        ->assertJsonPath('data.0.id', $question->id)
        ->assertJsonPath('data.0.product.name', $product->name);

    $this->patchJson("/api/questions/{$question->id}/answer", [
        'answer' => 'Yes, please check the available options.',
    ])->assertOk();

    expect($question->fresh()->answer)->toBe('Yes, please check the available options.');
});
