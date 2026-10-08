<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Services\ImageService;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    private const LIST_VERSION_KEY = 'products.list.version';

    public function index(Request $request)
    {
        $startTime = microtime(true);

        // 1. Unique cache key per query string, tied to the current list version.
        //    Bumping the version (see clearProductCache) invalidates every cached list at once.
        $queryString = http_build_query($request->query());
        $cacheKey = 'products.list.v' . $this->listVersion() . '.' . md5($queryString);

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

        // 3. Fast primary-key lookup for the page's items + eager load category
        $ids = $cached['ids'];
        $products = Product::with('category')
            ->whereIn('id', $ids)
            ->get()
            ->sortBy(function ($model) use ($ids) {
                return array_search($model->id, $ids); // Preserve sorted order from cache
            })
            ->values();

        // 4. Reconstruct the paginator
        $paginated = new LengthAwarePaginator(
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
    public function store(Request $request, ImageService $images)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'price' => 'required|integer|min:0', // BDT, whole units
            'category_id' => 'required|exists:categories,id',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:10240',
        ]);

        $validated['slug'] = Str::slug($validated['name']);

        // Upload to Cloudinary; image_path stores the Cloudinary public_id
        if ($request->hasFile('image')) {
            $validated['image_path'] = $images->upload($request->file('image'));
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
    public function update(Request $request, Product $product, ImageService $images)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'price' => 'sometimes|required|integer|min:0', // BDT, whole units
            'category_id' => 'sometimes|required|exists:categories,id',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:10240',
        ]);

        if (isset($validated['name'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $oldImage = $product->image_path;

        // Upload the new image first, so a failed upload keeps the old one
        if ($request->hasFile('image')) {
            $validated['image_path'] = $images->upload($request->file('image'));
        }

        // Unset raw file object
        unset($validated['image']);

        $product->update($validated);

        // Only delete the old image after the database update succeeded
        if (isset($validated['image_path'])) {
            $images->delete($oldImage);
        }

        $this->clearProductCache($product->id);

        return response()->json([
            'message' => 'Product updated successfully!',
            'updated_product' => new ProductResource($product),
        ], 200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Product $product, ImageService $images)
    {
        $imagePath = $product->image_path;

        $product->delete();

        $images->delete($imagePath);

        $this->clearProductCache($product->id);

        return response()->json(['message' => 'Product deleted successfully!'], 200);
    }

    /**
     * Current version number used in list cache keys.
     */
    private function listVersion(): int
    {
        return (int)Cache::rememberForever(self::LIST_VERSION_KEY, fn() => 1);
    }

    /**
     * Cache invalidation helper.
     *
     * Bumping the version makes every cached product list obsolete at once.
     * This works on any cache driver (file, database, redis), unlike scanning keys.
     * Old entries simply expire after their 1-hour TTL.
     */
    private function clearProductCache(?int $id = null): void
    {
        Cache::forever(self::LIST_VERSION_KEY, $this->listVersion() + 1);

        if ($id) {
            Cache::forget("products.show.{$id}");
        }
    }
}
