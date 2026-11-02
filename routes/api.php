<?php

use App\Http\Controllers\Api\Admin\AdminController;
use App\Http\Controllers\Api\Admin\AiController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Auth\SocialAuthController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductQuestionController;
use App\Http\Controllers\Api\ProductReviewController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\RecommendationController;
use Illuminate\Support\Facades\Route;

// public auth
Route::middleware('throttle:auth-strict')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    // Forgot / Reset Password Endpoints
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->name('password.reset');
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);

});

// public browsing
Route::middleware('throttle:api-general')->group(function () {
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/product/{product}', [ProductController::class, 'show']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{category}', [CategoryController::class, 'show']);
    Route::get('/reviews', [ProductReviewController::class, 'index']);

    // Socialite OAuth Routes
    Route::get('/auth/{provider}/redirect', [SocialAuthController::class, 'redirect']);
    Route::get('/auth/{provider}/callback', [SocialAuthController::class, 'callback']);

    // Product Recommendations
    Route::post('/cart/recommendations', [RecommendationController::class, 'getCartRecommendations']);
    Route::post('/products/{product}/recommendations', [RecommendationController::class, 'getProductRecommendations']);
});

// SSLCommerz Gate Callbacks & IPN Webhook (Public POST Endpoints)
Route::post('/payment/success', [PaymentController::class, 'success']);
Route::post('/payment/fail', [PaymentController::class, 'fail']);
Route::post('/payment/cancel', [PaymentController::class, 'cancel']);
Route::post('/payment/ipn', [PaymentController::class, 'ipn']);

// Protected & Authenticated routes
Route::middleware(['auth:sanctum', 'throttle:api-general'])->group(function () {

    // Email Verification
    Route::get('/email/verification-status', [AuthController::class, 'verificationStatus']);
    Route::post('/email/verify-code', [AuthController::class, 'verifyEmailCode']);
    Route::post(
        '/email/verification-notification',
        [AuthController::class, 'resendVerificationNotification']
    );

    // Auth endpoints
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Profile management
    Route::patch('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/email/request', [ProfileController::class, 'requestEmailChange']);
    Route::post('/profile/email/verify', [ProfileController::class, 'verifyEmailChange']);
    Route::post('/profile/email/resend', [ProfileController::class, 'resendEmailChangeCode']);
    Route::post('/profile/password/request', [ProfileController::class, 'requestPasswordChange']);
    Route::post('/profile/password/verify', [ProfileController::class, 'verifyPasswordChange']);
    Route::post('/profile/password/resend', [ProfileController::class, 'resendPasswordChangeCode']);

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
            Route::prefix('/admin/stats')->controller(DashboardController::class)->group(function () {
                Route::get('/summary', 'summary');
                Route::get('/sales', 'sales');
                Route::get('/orders-by-status', 'ordersByStatus');
                Route::get('/payment-methods', 'paymentMethods');
                Route::get('/payment-status', 'paymentStatus');
                Route::get('/top-products', 'topProducts');
                Route::get('/sales-by-category', 'salesByCategory');
                Route::get('/sales-by-city', 'salesByCity');
                Route::get('/new-customers', 'newCustomers');
                Route::get('/ratings', 'ratings');
                Route::get('/orders-heatmap', 'ordersHeatmap');
            });

            Route::get('/admin/dashboard', [AdminController::class, 'dashboard']);
            Route::get('/admin/products', [AdminController::class, 'products']);
            Route::get('/admin/categories', [AdminController::class, 'categories']);
            Route::get('/admin/orders', [AdminController::class, 'orders']);
            Route::get('/admin/orders/{order}', [AdminController::class, 'showOrder']);
            Route::get('/admin/order-options', [AdminController::class, 'orderOptions']);
            Route::post('/admin/orders', [AdminController::class, 'createOrder']);
            Route::put('/admin/orders/{order}', [AdminController::class, 'updateOrder']);
            Route::get('/admin/questions', [AdminController::class, 'questions']);
            Route::get('/admin/users', [AdminController::class, 'users']);
            Route::post('/admin/users', [AdminController::class, 'createUser']);
            Route::post('/admin/users/{user}/verify-email', [AdminController::class, 'verifyUserEmail']);

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
            Route::post('/ai/generate-image', [AiController::class, 'generateProductImage']);

            // Answering the questions
            Route::patch('/questions/{question}/answer', [ProductQuestionController::class, 'answer']);
        });
    });
});
