<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductController extends Controller
{

    public function index(Request $request)
    {
        $startTime = microtime(true);

        // 1. Generate unique cache key per query string
        $queryString = http_build_query($request->query());
        $cacheKey = 'products.list.' . md5($queryString);

        $isCacheHit = Cache::has($cacheKey);

        // 2. Cache ONLY the ID list and pagination metadata (tiny memory footprint)
        $cached = Cache::remember($cacheKey, 3600, function () use ($request) {
            $paginator = Product::query()
                ->when($request->query('search'), function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('description', 'like', "%{$search}%");
                    });
                })
                ->when($request->query('category_id'), function ($query, $categoryId) {
                    $query->where('category_id', $categoryId);
                })
                ->when($request->query('min_price'), function ($query, $minPrice) {
                    $query->where('price', '>=', $minPrice);
                })
                ->when($request->query('max_price'), function ($query, $maxPrice) {
                    $query->where('price', '<=', $maxPrice);
                })
                ->when($request->query('sort'), function ($query, $sort) {
                    match ($sort) {
                        'price_asc' => $query->orderBy('price', 'asc'),
                        'price_desc' => $query->orderBy('price', 'desc'),
                        'oldest' => $query->orderBy('created_at', 'asc'),
                        default => $query->latest(),
                    };
                }, function ($query) {
                    $query->latest();
                })
                ->paginate(15)
                ->withQueryString();

            return [
                'ids' => $paginator->pluck('id')->toArray(), // Store only IDs!
                'total' => $paginator->total(),
                'per_page' => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'path' => $request->url(),
                'query' => $request->query(),
            ];
        });

        // 3. Fast Primary Key lookup (WHERE id IN (...)) for the 15 items + eager load category
        $ids = $cached['ids'];
        $products = Product::with('category')
            ->whereIn('id', $ids)
            ->get()
            ->sortBy(function ($model) use ($ids) {
                return array_search($model->id, $ids); // Preserve sorted order from cache
            })
            ->values();

        // 4. Reconstruct Paginator
        $paginated = new \Illuminate\Pagination\LengthAwarePaginator(
            $products,
            $cached['total'],
            $cached['per_page'],
            $cached['current_page'],
            ['path' => $cached['path'], 'query' => $cached['query']]
        );

        $executionTimeMs = round((microtime(true) - $startTime) * 1000, 2);

        return ProductResource::collection($paginated)
            ->additional([
                'meta_cache' => [
                    'cache_hit' => $isCacheHit,
                    'cache_key' => $cacheKey,
                    'execution_time_ms' => $executionTimeMs . ' ms',
                ]
            ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'price' => 'required|integer|min:0', // BDT, whole units
            'category_id' => 'required|exists:categories,id',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:10240',
        ]);

        $validated['slug'] = Str::slug($validated['name']);

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products', 'public');
            $validated['image_path'] = $path;
        }

        // Unset the UploadedFile object so Eloquent doesn't try to persist it
        unset($validated['image']);

        $product = Product::create($validated);

        $this->clearProductCache();

        return response()->json(new ProductResource($product), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $product = Cache::remember("products.show.{$id}", 3600, function () use ($id) {
            return Product::with('category')->findOrFail($id);
        });

        return new ProductResource($product);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'price' => 'sometimes|required|integer|min:0', // BDT, whole units
            'category_id' => 'sometimes|required|exists:categories,id',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:10240', // matched to store()
        ]);

        if (isset($validated['name'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        if ($request->hasFile('image')) {
            // Delete old file if present
            if ($product->image_path && Storage::disk('public')->exists($product->image_path)) {
                Storage::disk('public')->delete($product->image_path);
            }

            // Upload new file
            $path = $request->file('image')->store('products', 'public');
            $validated['image_path'] = $path;
        }

        // Unset raw file object
        unset($validated['image']);

        $product->update($validated);

        $this->clearProductCache($product->id);

        return response()->json([
            'message' => 'Product updated successfully!',
            'updated_product' => new ProductResource($product),
        ], 200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Product $product)
    {
        if ($product->image_path && Storage::disk('public')->exists($product->image_path)) {
            Storage::disk('public')->delete($product->image_path);
        }

        $product->delete();

        $this->clearProductCache($product->id);

        return response()->json(['message' => 'Product deleted successfully!'], 200);
    }

    /**
     * Cache Invalidation Helper
     */
    private function clearProductCache(?int $id = null): void
    {
        if (config('cache.default') === 'redis') {
            $redis = Cache::redis();
            $keys = $redis->keys('*products.list.*');
            foreach ($keys as $key) {
                // Strip redis prefix if set
                $cleanKey = str_replace(config('database.redis.options.prefix', ''), '', $key);
                Cache::forget($cleanKey);
            }
        }

        if ($id) {
            Cache::forget("products.show.{$id}");
        }
    }
}
