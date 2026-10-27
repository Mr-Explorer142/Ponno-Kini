<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends Controller
{
    // Allowed providers array for validation
    private array $providers = ['google', 'github'];

    /**
     * Step 1: Generate the OAuth Redirect URL for React
     */
    public function redirect($provider)
    {
        if (!in_array($provider, $this->providers)) {
            return response()->json(['message' => 'Provider not supported'], 400);
        }

        $url = Socialite::driver($provider)
            ->stateless()
            ->redirect()
            ->getTargetUrl();

        return response()->json(['url' => $url]);
    }

    /**
     * Step 2: Handle the Callback from Google/GitHub
     */
    public function callback($provider)
    {
        if (!in_array($provider, $this->providers)) {
            return response()->json(['message' => 'Provider not supported'], 400);
        }

        try {
            // Must use stateless() here as well!
            $socialUser = Socialite::driver($provider)->stateless()->user();

            // Find existing user by email, or create a new one
            $user = User::firstOrCreate(
                ['email' => $socialUser->getEmail()],
                [
                    'name' => $socialUser->getName() ?? $socialUser->getNickname(),
                    'provider' => $provider,
                    'provider_id' => $socialUser->getId(),
                    'avatar' => $socialUser->getAvatar(),
                    'email_verified_at' => now(), // OAuth emails are pre-verified
                    'password' => null,  // No password needed
                ]
            );

            // Assign default role if they are a brand new user
            if (!$user->hasVerifiedEmail()) {
                $user->markEmailAsVerified();
            }

            if ($user->wasRecentlyCreated) {
                $user->assignRole('customer');
            }

            // Generate Sanctum Token
            $token = $user->createToken('auth_token')->plainTextToken;

            // Redirect back to the React frontend with the token embedded in the URL
            $frontendUrl = env('FRONTEND_URL') . '/social-login?token=' . $token;

            return redirect()->away($frontendUrl);
        } catch (\Exception $e) {
            Log::error("Socialite Callback Error ({$provider}): " . $e->getMessage());

            $errorUrl = env('FRONTEND_URL') . '/login?error=social_auth_failed';
            return redirect()->away($errorUrl);
        }
    }
}
