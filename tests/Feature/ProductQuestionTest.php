<?php

use App\Models\Product;
use App\Models\Question;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

it('allows a verified customer to ask a question that appears on the product page', function () {
    $customer = User::factory()->create();
    $product = Product::factory()->create();

    Sanctum::actingAs($customer);

    $response = $this->postJson("/api/products/{$product->id}/questions", [
        'question' => 'Does this product include a warranty?',
    ]);

    $response->assertCreated()
        ->assertJsonPath('question.question', 'Does this product include a warranty?');

    $question = Question::firstOrFail();

    $this->getJson("/api/product/{$product->id}")
        ->assertOk()
        ->assertJsonPath('data.questions.0.id', $question->id)
        ->assertJsonPath('data.questions.0.user', $customer->name)
        ->assertJsonPath('data.questions.0.answer', null);
});
