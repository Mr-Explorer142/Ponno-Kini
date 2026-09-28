<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $products = Product::with('category')
            // 1. Search by name or description
            ->when($request->query('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            // 2. Filter by category ID
            ->when($request->query('category_id'), function ($query, $categoryId) {
                $query->where('category_id', $categoryId);
            })
            // 3. Filter by price range (converting input dollars to cents)
            ->when($request->query('min_price'), function ($query, $minPrice) {
                $query->where('price', '>=', $minPrice * 100);
            })
            ->when($request->query('max_price'), function ($query, $maxPrice) {
                $query->where('price', '<=', $maxPrice * 100);
            })
            // 4. Sort results
            ->when($request->query('sort'), function ($query, $sort) {
                match ($sort) {
                    'price_asc' => $query->orderBy('price', 'asc'),
                    'price_desc' => $query->orderBy('price', 'desc'), // Fixed typo 'price_dsc'
                    'oldest' => $query->orderBy('created_at', 'asc'),
                    default => $query->latest(),
                };
            }, function ($query) {
                $query->latest();
            })
            ->paginate(15)
            ->withQueryString();

        return ProductResource::collection($products);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request) // Fixed: Removed Product $product argument
    {
//        dd($request->file('image')?->getError(), $request->file('image')?->getErrorMessage());

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'price' => 'required|integer|min:0',
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

        return response()->json(new ProductResource($product), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Product $product)
    {
        // Fixed: Wrapped in ProductResource for formatted output
        return new ProductResource($product->load('category'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string', // Fixed: Added 'sometimes'
            'price' => 'sometimes|required|integer|min:0',
            'category_id' => 'sometimes|required|exists:categories,id',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:2048',
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

        return response()->json([
            'message' => 'Product updated successfully!',
            'updated_product' => new ProductResource($product),
        ], 200); // Fixed HTTP status code to 200
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

        return response()->json(['message' => 'Product deleted successfully!'], 200); // Fixed HTTP status code to 200
    }
}
