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
        // 1. Validate the incoming cart product IDs
        $validated = $request->validate([
            'product_ids'   => 'required|array|min:1',
            'product_ids.*' => 'integer|exists:products,id',
        ]);

        $cartIds = $validated['product_ids'];

        // 2. Cart products (with category) to give the AI context
        $cartProducts = Product::with('category')->whereIn('id', $cartIds)->get();

        $cartContext = $cartProducts->map(function ($product) {
            return $product->name . ' (Category: ' . ($product->category->name ?? 'General') . ')';
        })->implode(', ');

        // 3. Candidate products the AI is allowed to pick from (real rows only)
        $candidates = Product::with('category:id,name')
            ->whereNotIn('id', $cartIds)
            ->select('id', 'name', 'category_id')
            ->latest()
            ->take(100)
            ->get();

        $candidateContext = $candidates->map(function ($product) {
            return $product->id . ' | ' . $product->name . ' | ' . ($product->category->name ?? 'General');
        })->implode("\n");

        // 4. Ask Gemini to choose from the real candidates
        $pickedIds = $this->askGeminiForProductIds($cartContext, $candidateContext, $candidates->pluck('id')->all());

        // 5. Load the AI's picks (keeping the AI's order)
        $recommended = collect();

        if (!empty($pickedIds)) {
            $recommended = Product::with('category')
                ->whereIn('id', $pickedIds)
                ->get()
                ->sortBy(fn ($product) => array_search($product->id, $pickedIds))
                ->values();
        }

        // 6. Fallback so the response is never empty: same category as the cart, then newest
        if ($recommended->isEmpty()) {
            $recommended = Product::with('category')
                ->whereNotIn('id', $cartIds)
                ->whereIn('category_id', $cartProducts->pluck('category_id')->unique())
                ->inRandomOrder()
                ->take(4)
                ->get();
        }

        if ($recommended->isEmpty()) {
            $recommended = Product::with('category')
                ->whereNotIn('id', $cartIds)
                ->latest()
                ->take(4)
                ->get();
        }

        return ProductResource::collection($recommended);
    }

    /**
     * Returns up to 4 product IDs chosen by Gemini, or [] on any failure.
     * Failures are logged but never break the customer's cart/checkout.
     */
    private function askGeminiForProductIds(string $cartContext, string $candidateContext, array $allowedIds): array
    {
        $apiKey = config('services.gemini.key');

        if (empty($apiKey)) {
            Log::error('Gemini API key is missing. Check config/services.php and .env.');
            return [];
        }

        $model = config('services.gemini.model', 'gemini-3.8-flash');
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";

        $prompt = "A customer has these items in their shopping cart: [{$cartContext}].\n\n";
        $prompt .= "Here are the products available in the store (format: id | name | category):\n{$candidateContext}\n\n";
        $prompt .= "Choose up to 4 products from that list that would make good cross-sell recommendations for this cart. ";
        $prompt .= "Only use ids that appear in the list. ";
        $prompt .= "Return ONLY a valid JSON object with a single key 'product_ids' containing an array of integer ids.";

        try {
            $response = Http::withHeaders([
                'x-goog-api-key' => $apiKey,
                'Content-Type'   => 'application/json',
            ])->timeout(15)->post($url, [
                'contents' => [
                    ['parts' => [['text' => $prompt]]],
                ],
                'generationConfig' => [
                    'responseMimeType' => 'application/json',
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Gemini Recommendation Connection Error: ' . $e->getMessage());
            return [];
        }

        if ($response->failed()) {
            Log::error('Gemini Recommendation Error: ' . $response->body());
            return [];
        }

        $text = $response->json('candidates.0.content.parts.0.text') ?? '{}';
        $decoded = json_decode($text, true);
        $ids = $decoded['product_ids'] ?? [];

        if (!is_array($ids)) {
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
