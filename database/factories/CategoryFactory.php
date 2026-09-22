<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->randomElement([
            'Electronics',
            'Fashion & Apparel',
            'Home & Kitchen',
            'Books & Stationery',
            'Sports & Outdoors',
            'Beauty & Personal Care',
            'Toys & Games',
            'Automotive',
            'Health & Wellness',
            'Gadgets & Accessories',
        ]);

        return [
            'name' => ucfirst($name),
            'slug' => Str::slug($name),
        ];
    }
}
