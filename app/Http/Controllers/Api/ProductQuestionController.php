<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\QuestionResource;
use App\Models\Product;
use App\Models\Question;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ProductQuestionController extends Controller
{
    // Customer asks a question
    public function store(Request $request, Product $product)
    {
        $validated = $request->validate([
            'question' => 'required|string|max:1000',
        ]);

        $question = $product->questions()->create([
            'user_id' => $request->user()->id,
            'question' => $validated['question'],
        ]);

        Cache::forget("products.show.{$product->id}");

        return response()->json([
            'message' => 'Question submitted successfully. Our team will answer shortly.',
            'question' => new QuestionResource($question->load('user'))
        ], 201);
    }

    // Admin answers the question
    public function answer(Request $request, Question $question)
    {
        $validated = $request->validate([
            'answer' => 'required|string|max:2000',
        ]);

        $question->update([
            'answer' => $validated['answer'],
            'answered_by' => $request->user()->id,
        ]);

        Cache::forget("products.show.{$question->product_id}");

        return response()->json([
            'message' => 'Question answered successfully.',
            'question' => new QuestionResource($question->load(['user', 'answerer']))
        ]);
    }
}
