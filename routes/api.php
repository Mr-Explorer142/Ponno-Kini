<?php

use App\Http\Controllers\Api\Admin\AiController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductQuestionController;
use App\Http\Controllers\Api\ProductReviewController;
use App\Http\Controllers\Api\RecommendationController;
use Illuminate\Support\Facades\Route;

// public auth
Route::middleware('throttle:auth-strict')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    // Forgot / Reset Password Endpoints
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->name('password.reset');
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);

    // Signed Email Verification Endpoint
    Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
        ->name('verification.verify');
});

// public browsing
Route::middleware('throttle:api-general')->group(function () {
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/product/{product}', [ProductController::class, 'show']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{category}', [CategoryController::class, 'show']);

    // Product Recommendations
    Route::post('/cart/recommendations', [RecommendationController::class, 'getCartRecommendations']);
});

// SSLCommerz Gate Callbacks & IPN Webhook (Public POST Endpoints)
Route::post('/payment/success', [PaymentController::class, 'success']);
Route::post('/payment/fail', [PaymentController::class, 'fail']);
Route::post('/payment/cancel', [PaymentController::class, 'cancel']);
Route::post('/payment/ipn', [PaymentController::class, 'ipn']);

// Protected & Authenticated routes
Route::middleware(['auth:sanctum', 'throttle:api-general'])->group(function () {

    // Email Verification Notification
    Route::post(
        '/email/verification-notification',
        [AuthController::class, 'resendVerificationNotification']
    );

    // Auth endpoints
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // verified email routes
    Route::middleware('verified')->group(function () {

        // Customer Orders
        Route::get('/orders', [OrderController::class, 'index']);
        Route::post('/orders', [OrderController::class, 'store']);
        Route::get('/orders/{order}', [OrderController::class, 'show']);

        // Download invoice
        Route::get('/orders/{order}/invoice', [OrderController::class, 'downloadInvoice']);

        // Payment
        Route::post('/orders/{order}/pay', [PaymentController::class, 'initiate']);

        // Giving reviews & Asking questions
        Route::post('/products/{product}/reviews', [ProductReviewController::class, 'store']);
        Route::post('/products/{product}/questions', [ProductQuestionController::class, 'store']);

        // Admin Catalog management
        Route::middleware('role:admin')->group(function () {

            // Products
            Route::post('/products', [ProductController::class, 'store']);
            Route::post('/products/{product}', [ProductController::class, 'update']);
            Route::delete('/products/{product}', [ProductController::class, 'destroy']);

            // Categories
            Route::post('/categories', [CategoryController::class, 'store']);
            Route::put('/categories/{category}', [CategoryController::class, 'update']);
            Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

            // Orders
            Route::patch(
                '/orders/{order}/status',
                [OrderController::class, 'updateStatus']
            );

            // SEO type Product description generator using GEMINI AI API
            Route::post('/ai/generate-description', [AiController::class, 'generateProductDescription']);

            // Answering the questions
            Route::patch('/questions/{question}/answer', [ProductQuestionController::class, 'answer']);
        });
    });
});
