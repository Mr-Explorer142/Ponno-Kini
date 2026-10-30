<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RecommendationController extends Controller
{
    public function getCartRecommendations(Request $request)
    {
        $validated = $request->validate([
            'product_ids' => 'required|array|min:1',
            'product_ids.*' => 'integer|exists:products,id',
        ]);

        $cartIds = $validated['product_ids'];
        $cartProducts = Product::with('category')->whereIn('id', $cartIds)->get();
        $cartContext = $cartProducts->map(function ($product) {
            return $product->name.' (Category: '.($product->category->name ?? 'General').')';
        })->implode(', ');

        return $this->recommend($cartContext, $cartIds, $cartProducts->pluck('category_id')->unique()->all());
    }

    public function getProductRecommendations(Product $product)
    {
        $product->loadMissing('category');
        $context = $product->name.' (Category: '.($product->category->name ?? 'General').')';

        return $this->recommend($context, [$product->id], [$product->category_id]);
    }

    private function recommend(string $context, array $excludedIds, array $categoryIds)
    {
        $candidates = Product::with('category:id,name')
            ->whereNotIn('id', $excludedIds)
            ->select('id', 'name', 'category_id')
            ->latest()
            ->take(100)
            ->get();

        $candidateContext = $candidates->map(function ($product) {
            return $product->id.' | '.$product->name.' | '.($product->category->name ?? 'General');
        })->implode("\n");

        $pickedIds = $this->askGeminiForProductIds(
            $context,
            $candidateContext,
            $candidates->pluck('id')->all()
        );

        $recommended = collect();
        if (! empty($pickedIds)) {
            $recommended = Product::with('category')
                ->whereIn('id', $pickedIds)
                ->get()
                ->sortBy(fn ($product) => array_search($product->id, $pickedIds))
                ->values();
        }

        if ($recommended->isEmpty()) {
            $recommended = Product::with('category')
                ->whereNotIn('id', $excludedIds)
                ->whereIn('category_id', $categoryIds)
                ->inRandomOrder()
                ->take(4)
                ->get();
        }

        if ($recommended->isEmpty()) {
            $recommended = Product::with('category')
                ->whereNotIn('id', $excludedIds)
                ->latest()
                ->take(4)
                ->get();
        }

        return ProductResource::collection($recommended);
    }

    /**
     * Returns up to 4 product IDs chosen by Gemini, or [] on any failure.
     * Failures are logged while the caller can still fall back to related products.
     */
    private function askGeminiForProductIds(string $context, string $candidateContext, array $allowedIds): array
    {
        $apiKey = config('services.gemini.key');

        if (empty($apiKey)) {
            Log::error('Gemini API key is missing. Check config/services.php and .env.');

            return [];
        }

        $model = config('services.gemini.model', 'gemini-3.8-flash');
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";

        $prompt = "A customer is viewing these products: [{$context}].\n\n";
        $prompt .= "Here are the products available in the store (format: id | name | category):\n{$candidateContext}\n\n";
        $prompt .= 'Choose up to 4 products from that list that are relevant recommendations for the viewed product(s). ';
        $prompt .= 'Only use ids that appear in the list. ';
        $prompt .= "Return ONLY a valid JSON object with a single key 'product_ids' containing an array of integer ids.";

        try {
            $response = Http::withHeaders([
                'x-goog-api-key' => $apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(15)->post($url, [
                'contents' => [
                    ['parts' => [['text' => $prompt]]],
                ],
                'generationConfig' => [
                    'responseMimeType' => 'application/json',
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Gemini Recommendation Connection Error: '.$e->getMessage());

            return [];
        }

        if ($response->failed()) {
            Log::error('Gemini Recommendation Error: '.$response->body());

            return [];
        }

        $text = $response->json('candidates.0.content.parts.0.text') ?? '{}';
        $decoded = json_decode($text, true);
        $ids = $decoded['product_ids'] ?? [];

        if (! is_array($ids)) {
            return [];
        }

        // Drop anything the AI invented that wasn't in the candidate list
        return array_values(array_slice(
            array_intersect(array_map('intval', $ids), $allowedIds),
            0,
            4
        ));
    }
}
