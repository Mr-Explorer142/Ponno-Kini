<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiController extends Controller
{
    public function generateProductDescription(Request $request)
    {
        // 1. Validate Admin Input
        $validated = $request->validate([
            'product_name' => 'required|string|max:255',
            'features' => 'nullable|string',
            'tone' => 'nullable|string|in:professional,playful,luxury,urgent',
        ]);

        $apiKey = config('services.gemini.key');

        if (empty($apiKey)) {
            Log::error('Gemini API key is missing. Check config/services.php and .env.');
            return response()->json([
                'message' => 'Failed to connect to AI service.',
            ], 500);
        }

        // Full Gemini endpoint: host + API version + model + action
        // in the controller
        $model = config('services.gemini.model');
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";

        // 2. Construct the AI Prompt
        $prompt = "You are an expert e-commerce SEO copywriter. Write a highly converting, SEO-optimized product description based on the following details. Do not include conversational filler like 'Here is your description', just output the description itself.\n\n";
        $prompt .= 'Product Name: ' . $validated['product_name'] . "\n";

        if (!empty($validated['features'])) {
            $prompt .= 'Key Features/Keywords: ' . $validated['features'] . "\n";
        }

        $tone = $validated['tone'] ?? 'professional';
        $prompt .= 'Tone of Voice: ' . $tone . "\n";
        $prompt .= 'Format: Return the output in clean, plain text with short paragraphs. Keep it under 150 words.';

        // 3. Make the API Call to Gemini
        try {
            $response = Http::withHeaders([
                'x-goog-api-key' => $apiKey,
                'Content-Type' => 'application/json',
            ])->post($url, [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt],
                        ],
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Gemini Connection Exception: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to connect to AI service.',
                'debug_error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }

        if ($response->failed()) {
            Log::error('Gemini API Error: ' . $response->body());
            return response()->json([
                'message' => 'Failed to connect to AI service.',
                'debug_error' => config('app.debug') ? ($response->json() ?? $response->body()) : null,
            ], $response->status());
        }

        // 4. Parse the Response
        $data = $response->json();
        $generatedText = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';

        if (empty($generatedText)) {
            Log::warning('Gemini returned an empty response.', ['response' => $data]);
            return response()->json([
                'message' => 'AI returned an empty response.',
                'debug_error' => config('app.debug') ? $data : null,
            ], 500);
        }

        return response()->json([
            'description' => trim($generatedText),
        ]);
    }
}
