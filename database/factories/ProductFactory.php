<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * Realistic product names per category.
     * Keys must match the names in CategoryFactory exactly.
     */
    private const CATALOG = [
        'Electronics' => ['Wireless Mouse', 'Bluetooth Speaker', 'Smart LED TV', 'HDMI Cable', 'Mechanical Keyboard', 'Noise Cancelling Headphones', 'HD Webcam', 'Power Bank'],
        'Fashion & Apparel' => ['Cotton T-Shirt', 'Denim Jeans', 'Leather Belt', 'Hooded Sweatshirt', 'Casual Sneakers', 'Silk Scarf', 'Formal Shirt', 'Canvas Backpack'],
        'Home & Kitchen' => ['Non-stick Frying Pan', 'Electric Kettle', 'Knife Set', 'Storage Containers', 'Bed Sheet Set', 'Rice Cooker', 'Blender', 'Dinner Plate Set'],
        'Books & Stationery' => ['Spiral Notebook', 'Gel Pen Pack', 'Hardcover Journal', 'Desk Organizer', 'Highlighter Set', 'Sketchbook', 'Stapler', 'Sticky Notes'],
        'Sports & Outdoors' => ['Yoga Mat', 'Football', 'Camping Tent', 'Water Bottle', 'Cricket Bat', 'Jump Rope', 'Running Shoes', 'Dumbbell Set'],
        'Beauty & Personal Care' => ['Face Moisturizer', 'Shampoo', 'Hair Dryer', 'Lip Balm', 'Sunscreen Lotion', 'Perfume', 'Beard Trimmer', 'Body Wash'],
        'Toys & Games' => ['Building Blocks', 'Board Game', 'Remote Control Car', 'Puzzle Set', 'Plush Teddy Bear', 'Card Game', 'Action Figure', 'Art & Craft Kit'],
        'Automotive' => ['Car Phone Holder', 'Seat Cover', 'Engine Oil', 'Tyre Inflator', 'Dash Camera', 'Car Vacuum Cleaner', 'Floor Mats', 'Jump Starter'],
        'Health & Wellness' => ['Digital Thermometer', 'Vitamin C Tablets', 'Blood Pressure Monitor', 'Herbal Tea', 'Massage Gun', 'First Aid Kit', 'Protein Powder', 'Yoga Block'],
        'Gadgets & Accessories' => ['Phone Case', 'Screen Protector', 'USB-C Charger', 'Smart Watch', 'Wireless Earbuds', 'Laptop Stand', 'Phone Tripod', 'Mouse Pad'],
    ];

    private const VARIANTS = ['', '', 'Pro', 'Mini', 'Plus', 'Lite'];

    /**
     * Default: attach to a random existing category (or create one),
     * with a name that matches it.
     */
    public function definition(): array
    {
        $category = Category::inRandomOrder()->first() ?? Category::factory()->create();

        return array_merge($this->attributesFor($category), [
            'price' => fake()->numberBetween(10, 15000),
        ]);
    }

    /**
     * Use this when seeding so the product belongs to a specific category.
     */
    public function forCategory(Category $category): static
    {
        return $this->state(fn () => $this->attributesFor($category));
    }

    private function attributesFor(Category $category): array
    {
        $names = self::CATALOG[$category->name] ?? null;

        // Fallback for custom categories that aren't in the catalog above
        $base = $names ? fake()->randomElement($names) : ucfirst(fake()->words(2, true));
        $name = trim($base . ' ' . fake()->randomElement(self::VARIANTS));

        return [
            'category_id' => $category->id,
            'name' => $name,
            // random suffix keeps the unique slug from colliding on repeated names
            'slug' => Str::slug($name) . '-' . Str::lower(Str::random(5)),
            'description' => "A reliable {$name} from our {$category->name} collection. Great value and built to last.",
        ];
    }
}
