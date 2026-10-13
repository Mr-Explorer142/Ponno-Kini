<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'order_number' => 'ORD-' . strtoupper(Str::random(8)),
            'status' => 'pending',
            'payment_status' => 'pending',
            'total_amount' => 0,
            'shipping_address' => [
                'street' => fake()->streetAddress(),
                'city' => 'Dhaka',
                'postal_code' => '1000',
                'country' => 'BD',
                'phone' => '01700000000',
            ],
        ];
    }
}
