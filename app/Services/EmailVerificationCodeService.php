<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class EmailVerificationCodeService
{
    public function issue(User $user): string
    {
        $letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        $digits = '23456789';
        $characters = $letters.$digits;
        $code = $letters[random_int(0, strlen($letters) - 1)]
            .$digits[random_int(0, strlen($digits) - 1)];

        for ($index = 0; $index < 4; $index++) {
            $code .= $characters[random_int(0, strlen($characters) - 1)];
        }

        $code = str_split($code);
        for ($index = count($code) - 1; $index > 0; $index--) {
            $swapIndex = random_int(0, $index);
            [$code[$index], $code[$swapIndex]] = [$code[$swapIndex], $code[$index]];
        }
        $code = implode('', $code);

        $user->forceFill([
            'verification_code_hash' => Hash::make($code),
            'verification_code_expires_at' => now()->addMinutes(10),
            'verification_code_sent_at' => now(),
            'verification_attempts' => 0,
        ])->save();

        return $code;
    }
}
