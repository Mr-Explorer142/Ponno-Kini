<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // 5 attempts per minute per IP
        RateLimiter::for('auth-strict', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip())->response(function () {
                return response()->json([
                    'message' => 'Too many login attempts, Please try again in 60 seconds!',
                ], 429);
            });
        });

        // 60 requests per minute per IP and user
        RateLimiter::for('api-general', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });
    }
}
