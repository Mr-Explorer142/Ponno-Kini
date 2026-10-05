<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $categories = Cache::remember('categories.all', 86400, function () {
            return Category::all();
        });

        return CategoryResource::collection($categories);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $validated['slug'] = Str::slug($validated['name']);

        $category = Category::create($validated);

        $this->clearCategoryCache();

        return response()->json($category, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $category = Cache::remember("categories.show.{$id}", 86400, function () use ($id) {
            return Category::findOrFail($id);
        });

        return new CategoryResource($category);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Category $category)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $validated['slug'] = Str::slug($validated['name']);

        $category->update($validated);

        $this->clearCategoryCache($category->id);

        return response()->json([
            'message' => 'Category updated successfully',
            'updated_category' => $category
        ], Response::HTTP_OK);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Category $category)
    {
        $category->delete();

        $this->clearCategoryCache($category->id);

        return response()->json([
            'message' => 'Category deleted successfully!',
            'deleted_category' => $category,
        ], Response::HTTP_OK);
    }

    /**
     * Cache Invalidation Helper
     */
    private function clearCategoryCache(?int $id = null): void
    {
        Cache::forget('categories.all');
        if ($id) {
            Cache::forget("categories.show.{$id}");
        }
    }
}
