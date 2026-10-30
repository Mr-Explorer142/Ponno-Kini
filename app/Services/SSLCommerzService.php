<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SSLCommerzService
{
    protected string $storeId;

    protected string $storePassword;

    protected string $apiDomain;

    public function __construct()
    {
        $this->storeId = config('sslcommerz.store_id');
        $this->storePassword = config('sslcommerz.store_password');
        $this->apiDomain = config('sslcommerz.api_domain');
    }

    /**
     * Initiate payment request with SSLCommerz Gateway
     */
    public function initiatePayment(Order $order, string $transactionId): array
    {
        $shipping = $order->shipping_address;

        $postData = [
            'store_id' => $this->storeId,
            'store_passwd' => $this->storePassword,
            'total_amount' => $order->total_amount,
            'currency' => 'BDT',
            'tran_id' => $transactionId,
            'product_category' => 'General',
            'success_url' => url('/api/payment/success'),
            'fail_url' => url('/api/payment/fail'),
            'cancel_url' => url('/api/payment/cancel'),
            'ipn_url' => url('/api/payment/ipn'),

            // Customer Details
            'cus_name' => $order->user->name,
            'cus_email' => $order->user->email,
            'cus_add1' => $shipping['street'] ?? 'Dhaka',
            'cus_city' => $shipping['city'] ?? 'Dhaka',
            'cus_postcode' => $shipping['postal_code'] ?? '1000',
            'cus_country' => $shipping['country'] ?? 'Bangladesh',
            'cus_phone' => $shipping['phone'] ?? '01700000000',

            // Shipment Parameters
            'shipping_method' => 'NO',
            'product_name' => 'Order #'.$order->order_number,
        ];

        $response = Http::asForm()->post("{$this->apiDomain}/gwprocess/v4/api.php", $postData);

        if ($response->failed()) {
            Log::error('SSLCommerz Initiation Failed', ['response' => $response->body()]);

            return ['status' => 'FAILED', 'message' => 'Unable to connect to payment gateway.'];
        }

        return $response->json();
    }

    /**
     * Verify payment status using SSLCommerz Validation API
     */
    public function validatePayment(string $valId, string $transactionId, int $amount): bool
    {
        $url = "{$this->apiDomain}/validator/api/validationserverAPI.php?".http_build_query([
            'val_id' => $valId,
            'store_id' => $this->storeId,
            'store_passwd' => $this->storePassword,
            'format' => 'json',
        ]);

        $response = Http::get($url);

        if ($response->successful()) {
            $data = $response->json();

            return in_array($data['status'] ?? null, ['VALID', 'VALIDATED'], true)
                && ($data['tran_id'] ?? null) === $transactionId
                && ($data['currency'] ?? null) === 'BDT'
                && is_numeric($data['amount'] ?? null)
                && (float) $data['amount'] === (float) $amount;
        }

        return false;
    }
}
