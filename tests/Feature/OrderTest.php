<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
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
});
