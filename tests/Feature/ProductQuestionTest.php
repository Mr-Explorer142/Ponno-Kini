<?php

use App\Models\Product;
use App\Models\Question;
use App\Models\User;
use App\Notifications\StorefrontNotification;
use Illuminate\Support\Facades\Notification;
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

it('notifies admins about customer questions and customers when an answer is posted', function () {
    Notification::fake();
    $admin = User::factory()->create()->assignRole('admin');
    $customer = User::factory()->create();
    $product = Product::factory()->create();

    Sanctum::actingAs($customer);
    $response = $this->postJson("/api/products/{$product->id}/questions", [
        'question' => 'Does this product include a warranty?',
    ])->assertCreated();

    $questionId = $response->json('question.id');
    Notification::assertSentTo($admin, StorefrontNotification::class, fn ($notification) => $notification->eventType === 'question.submitted');

    Sanctum::actingAs($admin);
    $this->patchJson("/api/questions/{$questionId}/answer", [
        'answer' => 'Yes, it includes a one-year warranty.',
    ])->assertOk();

    Notification::assertSentTo($customer, StorefrontNotification::class, fn ($notification) => $notification->eventType === 'question.answered');
});
