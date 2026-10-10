<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ProductReviewController extends Controller
{
    public function store(Request $request, Product $product)
    {
        $validated = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $user = $request->user();

        // 1. Industry Standard: Check if a user actually bought the item and order is completed/paid
        $hasPurchased = $user->orders()
            ->where('payment_status', 'paid')
            ->whereHas('items', fn($query) => $query->where('product_id', $product->id))
            ->exists();

        if (!$hasPurchased) {
            return response()->json(['message' => 'You can only review products you have purchased.'], 403);
        }

        // 2. Insert or Update Review (allows users to edit their existing review)
        $review = $product->reviews()->updateOrCreate(
            ['user_id' => $user->id], // Condition
            ['rating' => $validated['rating'], 'comment' => $validated['comment']] // Data
        );

        // 3. Clear the specific product cache so the new review appears instantly
        Cache::forget("products.show.{$product->id}");

        return response()->json([
            'message' => 'Review submitted successfully.',
            'review' => new ReviewResource($review->load('user'))
        ], 201);
    }
}
