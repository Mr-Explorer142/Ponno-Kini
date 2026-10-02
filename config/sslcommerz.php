<?php

return [
    'store_id' => env('SSLCOMMERZ_STORE_ID', ''),
    'store_password' => env('SSLCOMMERZ_STORE_PASSWORD', ''),
    'is_sandbox' => env('SSLCOMMERZ_IS_SANDBOX', true),
    'api_domain' => env('SSLCOMMERZ_IS_SANDBOX', true)
        ? 'https://sandbox.sslcommerz.com'
        : 'https://securepay.sslcommerz.com',
];
