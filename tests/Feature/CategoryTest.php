<?php

use App\Models\Category;
use Illuminate\Support\Facades\Cache;

it('lists categories using cache-safe data', function () {
    $category = Category::factory()->create([
        'name' => 'Home Decor',
        'slug' => 'home-decor',
    ]);

    $response = $this->getJson('/api/categories');

    expect($response->status())->toBe(200)
        ->and($response->json('data.0'))->toMatchArray([
            'id' => $category->id,
            'name' => 'Home Decor',
            'slug' => 'home-decor',
        ])
        ->and(Cache::get('categories.all.v2'))->toBeArray();
});
