<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProductController;
use Illuminate\Support\Facades\Route;

// public auth
Route::middleware('throttle:auth-strict')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

// public browsing
Route::middleware('throttle:api-general')->group(function () {
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/product/{product}', [ProductController::class, 'show']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{category}', [CategoryController::class, 'show']);
});

// SSLCommerz Gate Callbacks & IPN Webhook (Public POST Endpoints)
Route::post('/payment/success', [PaymentController::class, 'success']);
Route::post('/payment/fail', [PaymentController::class, 'fail']);
Route::post('/payment/cancel', [PaymentController::class, 'cancel']);
Route::post('/payment/ipn', [PaymentController::class, 'ipn']);

// Protected routes
Route::middleware(['auth:sanctum', 'throttle:api-general'])->group(function () {
    // Auth endpoints
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Order Endpoints for authenticated customers
    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);

    // Payment initiation
    Route::post('/orders/{order}/pay', [PaymentController::class, 'initiate']);

    // Admin Catalog management (Create, Update & Delete of Products, Categories & Orders)
    Route::middleware('role:admin')->group(function () {
        // Product
        Route::post('/products', [ProductController::class, 'store']);
        // using post just for image
        Route::post('/products/{product}', [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);

        // Catalog
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

        // Orders
        Route::patch('/orders/{order}/status', [\App\Http\Controllers\Api\OrderController::class, 'updateStatus']);
    });

});
