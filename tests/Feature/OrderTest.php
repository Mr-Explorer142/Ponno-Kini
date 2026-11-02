<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use App\Notifications\PaymentSuccessfulNotification;
use App\Notifications\StorefrontNotification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;

it('calculates order total from the database, ignoring user input prices', function () {
    $customer = User::factory()->create()->assignRole('customer');
    $category = Category::factory()->create();

    $product = Product::factory()->create([
        'category_id' => $category->id,
        'price' => 500,
    ]);

    Sanctum::actingAs($customer);

    $response = $this->postJson('/api/orders', [
        'shipping_address' => [
            'street' => '123 Test St',
            'city' => 'Dhaka',
            'postal_code' => '1000',
            'country' => 'BD',
            'phone' => '01700000000',
        ],
        'items' => [
            [
                'product_id' => $product->id,
                'quantity' => 2,
                'price' => 1, // Attacker tries to alter price
            ],
        ],
    ]);

    expect($response->status())->toBe(201);

    // Fetch the created order and chain property expectations
    $order = Order::where('user_id', $customer->id)->first();

    expect($order)
        ->not->toBeNull()
        ->total_amount->toBe(1070) // 2 qty * 500 DB price + Dhaka delivery
        ->delivery_charge->toBe(70)
        ->status->toBe('pending');

    expect($customer->fresh()->address['street'])->toBe('123 Test St');
});

it('charges the outside-Dhaka delivery rate for an order', function () {
    $customer = User::factory()->create()->assignRole('customer');
    $category = Category::factory()->create();
    $product = Product::factory()->create([
        'category_id' => $category->id,
        'price' => 500,
    ]);

    Sanctum::actingAs($customer);

    $response = $this->postJson('/api/orders', [
        'shipping_address' => [
            'street' => 'Arja Dattapara, Shibchar',
            'city' => 'Madaripur',
            'postal_code' => '7921',
            'country' => 'Bangladesh',
            'phone' => '01700000002',
        ],
        'items' => [
            ['product_id' => $product->id, 'quantity' => 1],
        ],
    ]);

    $response->assertCreated()
        ->assertJsonPath('total_amount', 620)
        ->assertJsonPath('delivery_charge', 120);
});

it('charges the discounted product price and records the discount on an order', function () {
    $customer = User::factory()->create()->assignRole('customer');
    $product = Product::factory()->create([
        'price' => 1000,
        'discount_price' => 750,
        'stock' => 4,
    ]);
    Sanctum::actingAs($customer);

    $response = $this->postJson('/api/orders', [
        'shipping_address' => [
            'street' => '123 Test St',
            'city' => 'Dhaka',
            'postal_code' => '1000',
            'country' => 'BD',
            'phone' => '01700000000',
        ],
        'items' => [['product_id' => $product->id, 'quantity' => 2]],
    ])->assertCreated()
        ->assertJsonPath('discount_amount', 500)
        ->assertJsonPath('items.0.unit_price', 750)
        ->assertJsonPath('items.0.subtotal', 1500)
        ->assertJsonPath('total_amount', 1570);

    expect(Order::findOrFail($response->json('id'))->discount_amount)->toBe(500);
});

it('reserves stock when creating an order and prevents orders beyond available stock', function () {
    $customer = User::factory()->create()->assignRole('customer');
    $product = Product::factory()->create(['stock' => 3, 'price' => 500]);
    Sanctum::actingAs($customer);

    $this->postJson('/api/orders', [
        'shipping_address' => [
            'street' => '123 Test St',
            'city' => 'Dhaka',
            'postal_code' => '1000',
            'country' => 'BD',
            'phone' => '01700000000',
        ],
        'items' => [['product_id' => $product->id, 'quantity' => 2]],
    ])->assertCreated()
        ->assertJsonPath('payment_method', 'online');

    expect($product->fresh()->stock)->toBe(1)
        ->and(Order::firstOrFail()->stock_reserved)->toBeTrue();

    $this->postJson('/api/orders', [
        'shipping_address' => [
            'street' => '123 Test St',
            'city' => 'Dhaka',
            'postal_code' => '1000',
            'country' => 'BD',
            'phone' => '01700000000',
        ],
        'items' => [['product_id' => $product->id, 'quantity' => 2]],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('items');

    expect($product->fresh()->stock)->toBe(1)
        ->and(Order::count())->toBe(1);
});

it('creates cash-on-delivery orders as pending and does not allow gateway payment', function () {
    $customer = User::factory()->create()->assignRole('customer');
    $product = Product::factory()->create(['stock' => 2]);
    Sanctum::actingAs($customer);

    $response = $this->postJson('/api/orders', [
        'shipping_address' => [
            'street' => '123 Test St',
            'city' => 'Dhaka',
            'postal_code' => '1000',
            'country' => 'BD',
            'phone' => '01700000000',
        ],
        'payment_method' => 'cod',
        'items' => [['product_id' => $product->id, 'quantity' => 1]],
    ])->assertCreated()
        ->assertJsonPath('payment_method', 'cod')
        ->assertJsonPath('payment_status', 'pending');

    $this->postJson("/api/orders/{$response->json('id')}/pay")
        ->assertUnprocessable();

    expect($product->fresh()->stock)->toBe(1)
        ->and(Payment::count())->toBe(0);
});

it('notifies the customer and admins when an order is placed and the customer when its status changes', function () {
    Notification::fake();

    $customer = User::factory()->create()->assignRole('customer');
    $admin = User::factory()->create()->assignRole('admin');
    $product = Product::factory()->create();
    Sanctum::actingAs($customer);

    $response = $this->postJson('/api/orders', [
        'shipping_address' => [
            'street' => '123 Test St',
            'city' => 'Dhaka',
            'postal_code' => '1000',
            'country' => 'BD',
            'phone' => '01700000000',
        ],
        'items' => [['product_id' => $product->id, 'quantity' => 1]],
    ])->assertCreated();

    $orderId = $response->json('id');
    Notification::assertSentTo($customer, StorefrontNotification::class, fn ($notification) => $notification->eventType === 'order.placed');
    Notification::assertSentTo($admin, StorefrontNotification::class, fn ($notification) => $notification->eventType === 'order.placed');

    Sanctum::actingAs($admin);
    $this->patchJson("/api/orders/{$orderId}/status", ['status' => 'processing'])
        ->assertOk();

    Notification::assertSentTo($customer, StorefrontNotification::class, fn ($notification) => $notification->eventType === 'order.status_changed');
});

it('lists a user’s notifications and allows only that user to mark them as read', function () {
    $customer = User::factory()->create();
    $otherCustomer = User::factory()->create();
    $notification = new StorefrontNotification(
        'order.placed',
        'Your order was placed.',
        '/orders',
        ['order_id' => 42],
    );
    $customer->notify($notification);
    $notificationId = $customer->notifications()->firstOrFail()->id;

    Sanctum::actingAs($customer);
    $this->getJson('/api/notifications')
        ->assertOk()
        ->assertJsonPath('unread_count', 1)
        ->assertJsonPath('notifications.0.data.type', 'order.placed');

    Sanctum::actingAs($otherCustomer);
    $this->patchJson("/api/notifications/{$notificationId}/read")->assertNotFound();

    Sanctum::actingAs($customer);
    $this->patchJson("/api/notifications/{$notificationId}/read")->assertOk();
    $this->postJson('/api/notifications/read-all')->assertOk();

    expect($customer->unreadNotifications()->count())->toBe(0);
});

it('restores reserved stock when an online payment fails', function () {
    $customer = User::factory()->create()->assignRole('customer');
    $product = Product::factory()->create(['stock' => 3]);
    Sanctum::actingAs($customer);

    $orderResponse = $this->postJson('/api/orders', [
        'shipping_address' => [
            'street' => '123 Test St',
            'city' => 'Dhaka',
            'postal_code' => '1000',
            'country' => 'BD',
            'phone' => '01700000000',
        ],
        'items' => [['product_id' => $product->id, 'quantity' => 2]],
    ])->assertCreated();

    $order = Order::findOrFail($orderResponse->json('id'));
    $transactionId = $order->order_number.'-FAILED01';
    Payment::create([
        'order_id' => $order->id,
        'transaction_id' => $transactionId,
        'amount' => $order->total_amount,
        'currency' => 'BDT',
        'status' => 'pending',
    ]);

    $this->post('/api/payment/fail', ['tran_id' => $transactionId])->assertRedirect();

    expect($product->fresh()->stock)->toBe(3)
        ->and($order->fresh()->stock_reserved)->toBeFalse()
        ->and($order->fresh()->status)->toBe('failed');
});

it('marks a validated SSLCommerz payment paid and redirects to the order result', function () {
    Notification::fake();

    $customer = User::factory()->create();
    $admin = User::factory()->create()->assignRole('admin');
    $order = Order::factory()->for($customer)->create([
        'total_amount' => 620,
        'delivery_charge' => 120,
    ]);
    $transactionId = $order->order_number.'-ABC12345';

    Payment::create([
        'order_id' => $order->id,
        'transaction_id' => $transactionId,
        'amount' => 620,
        'currency' => 'BDT',
        'status' => 'pending',
    ]);

    Http::fake([
        '*validationserverAPI.php*' => Http::response([
            'status' => 'VALID',
            'tran_id' => $transactionId,
            'currency' => 'BDT',
            'amount' => '620.00',
        ]),
    ]);

    $response = $this->post('/api/payment/success', [
        'tran_id' => $transactionId,
        'val_id' => 'validation-123',
        'card_type' => 'VISA',
    ]);

    $response->assertRedirect(
        config('app.frontend_url').'/order-result?order_id='.$order->id.'&payment=success',
    );
    expect($order->fresh())
        ->payment_status->toBe('paid')
        ->status->toBe('processing');
    expect(Payment::where('transaction_id', $transactionId)->value('status'))
        ->toBe('paid');

    Notification::assertSentTo($customer, PaymentSuccessfulNotification::class);
    Notification::assertSentTo($admin, StorefrontNotification::class, fn ($notification) => $notification->eventType === 'payment.succeeded');
    Notification::assertSentTo($customer, StorefrontNotification::class, fn ($notification) => $notification->eventType === 'order.status_changed');
});
