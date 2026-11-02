<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\QuestionResource;
use App\Models\Product;
use App\Models\Question;
use App\Models\User;
use App\Notifications\StorefrontNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class ProductQuestionController extends Controller
{
    // Customer asks a question
    public function store(Request $request, Product $product)
    {
        $validated = $request->validate([
            'question' => 'required|string|max:1000',
        ]);

        $question = DB::transaction(function () use ($request, $product, $validated) {
            $question = $product->questions()->create([
                'user_id' => $request->user()->id,
                'question' => $validated['question'],
            ]);

            Notification::send(User::role('admin')->get(), new StorefrontNotification(
                'question.submitted',
                "{$request->user()->name} asked a question about {$product->name}.",
                '/admin/questions',
                ['question_id' => $question->id, 'product_id' => $product->id],
            ));

            return $question;
        });

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

        $question = DB::transaction(function () use ($request, $question, $validated) {
            $question->update([
                'answer' => $validated['answer'],
                'answered_by' => $request->user()->id,
            ]);

            $question->user?->notify(new StorefrontNotification(
                'question.answered',
                "Your question about {$question->product->name} has been answered.",
                "/products/{$question->product_id}",
                ['question_id' => $question->id, 'product_id' => $question->product_id],
            ));

            return $question;
        });

        Cache::forget("products.show.{$question->product_id}");

        return response()->json([
            'message' => 'Question answered successfully.',
            'question' => new QuestionResource($question->load(['user', 'answerer']))
        ]);
    }
}
