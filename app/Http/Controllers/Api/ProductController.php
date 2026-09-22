<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $product = Product::with
        ('category')->when($request->query('search'), function ($query, $search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}")->orWhere('description', 'like', "%{$search}");
            });
        }) // 1. search by name or description
        ->when($request->query('category_id'), function ($query, $category_id) {
            $query->where('category_id', $category_id);
        }) // 2. search by category ID
        ->when($request->query('min_price'), function ($query, $minPrice) {
            $query->where('price', '>=', $minPrice * 100);
        })
            ->when($request->query('max_price'), function ($query, $maxPrice) {
                $query->where('price', '<=', $maxPrice * 100);
            }) // 3. Filter by price range (converting input dollars to cents)
            ->when($request->query('sort'), function ($query, $sort) {
                match ($sort) {
                    'price_asc' => $query->orderBy('price', 'asc'),
                    'price_dsc' => $query->orderBy('price', 'dsc'),
                    'oldest' => $query->orderBy('created_at', 'asc'),
                    default => $query->latest(),
                };
            }, function ($query) {
                $query->latest(); // Default sort when 'sort' parameter is removed
            })
            ->paginate(15)->withQueryString(); // Keeps query parameters attached to page 2, 3, etc.
        return ProductResource::collection($product);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'price' => 'required|integer|min:0',
            'category_id' => 'required|exists:categories,id',
        ]);

        $validated['slug'] = Str::slug($validated['name']);

        $product = Product::create($validated);

        return response()->json($product, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Product $product)
    {
        return $product->load('category');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'price' => 'required|integer|min:0',
            'category_id' => 'required|exists:categories,id',
        ]);

        $validated['slug'] = Str::slug($validated['name']);

        $product->update($validated);

        return response()->json([
            'message' => 'product updated successfully!',
            'updated_product' => $product,
        ], 201);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Product $product)
    {
        $product->delete();
        return response()->json([
            'message' => 'Product deleted successfully!',
            'deleted_product' => $product
        ], 201);
    }
}
