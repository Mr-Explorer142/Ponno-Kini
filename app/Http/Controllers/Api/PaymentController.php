<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Notifications\PaymentSuccessfulNotification;
use App\Services\SSLCommerzService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    protected SSLCommerzService $sslCommerz;

    public function __construct(SSLCommerzService $sslCommerz)
    {
        $this->sslCommerz = $sslCommerz;
    }

    // 1. Initiate Payment
    public function initiate(Request $request, Order $order)
    {
        if ($order->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized order payment request.'], 403);
        }

        if ($order->payment_status === 'paid') {
            return response()->json(['message' => 'Order is already paid.'], 400);
        }

        $result = $this->sslCommerz->initiatePayment($order);

        if (isset($result['status']) && $result['status'] === 'SUCCESS') {
            // Create pending record in payments table
            Payment::create([
                'order_id' => $order->id,
                'transaction_id' => $order->order_number,
                'gateway' => 'sslcommerz',
                'amount' => $order->total_amount,
                'currency' => 'BDT',
                'status' => 'pending',
                'raw_response' => $result,
            ]);

            return response()->json([
                'payment_url' => $result['GatewayPageURL'],
                'status' => 'pending',
            ]);
        }

        return response()->json([
            'message' => 'Failed to generate SSLCommerz payment session.',
            'error' => $result['failedreason'] ?? 'Gateway connection error',
        ], 500);
    }

    // 2. Success Callback
    public function success(Request $request)
    {
        $tranId = $request->input('tran_id');
        $valId = $request->input('val_id');
        $cardType = $request->input('card_type');

        $order = Order::where('order_number', $tranId)->firstOrFail();
        $payment = Payment::where('transaction_id', $tranId)->latest()->first();

        if ($this->sslCommerz->validatePayment($valId)) {
            DB::transaction(function () use ($order, $payment, $valId, $cardType, $request) {
                // Update Payment Log
                if ($payment) {
                    $payment->update([
                        'status' => 'paid',
                        'val_id' => $valId,
                        'card_type' => $cardType,
                        'raw_response' => $request->all(),
                    ]);
                }

                // Update Master Order
                $order->update([
                    'payment_status' => 'paid',
                    'status' => 'processing',
                ]);

                $order->user->notify(new PaymentSuccessfulNotification($order));
            });

            return response()->json([
                'message' => 'Payment successful!',
                'order_number' => $order->order_number,
                'status' => 'paid',
            ]);
        }

        if ($payment) {
            $payment->update(['status' => 'failed', 'raw_response' => $request->all()]);
        }
        $order->update(['payment_status' => 'failed', 'status' => 'failed']);

        return response()->json(['message' => 'Payment validation failed.'], 400);
    }

    // 3. Fail Callback
    public function fail(Request $request)
    {
        $tranId = $request->input('tran_id');
        $order = Order::where('order_number', $tranId)->first();
        $payment = Payment::where('transaction_id', $tranId)->latest()->first();

        if ($payment) {
            $payment->update(['status' => 'failed', 'raw_response' => $request->all()]);
        }
        if ($order) {
            $order->update(['payment_status' => 'failed', 'status' => 'failed']);
        }

        return response()->json(['message' => 'Payment failed.'], 400);
    }

    // 4. Cancel Callback
    public function cancel(Request $request)
    {
        $tranId = $request->input('tran_id');
        $order = Order::where('order_number', $tranId)->first();
        $payment = Payment::where('transaction_id', $tranId)->latest()->first();

        if ($payment) {
            $payment->update(['status' => 'cancelled', 'raw_response' => $request->all()]);
        }
        if ($order) {
            $order->update(['payment_status' => 'cancelled', 'status' => 'cancelled']);
        }

        return response()->json(['message' => 'Payment cancelled by user.']);
    }

    // 5. IPN Webhook
    public function ipn(Request $request)
    {
        $tranId = $request->input('tran_id');
        $valId = $request->input('val_id');
        $status = $request->input('status');
        $cardType = $request->input('card_type');

        $order = Order::where('order_number', $tranId)->first();
        $payment = Payment::where('transaction_id', $tranId)->latest()->first();

        if (!$order) {
            return response()->json(['message' => 'Order not found.'], 404);
        }

        if ($order->payment_status === 'paid') {
            return response()->json(['message' => 'IPN Processed: Already Paid']);
        }

        if ($status === 'VALID' && $valId && $this->sslCommerz->validatePayment($valId)) {
            DB::transaction(function () use ($order, $payment, $valId, $cardType, $request) {
                if ($payment) {
                    $payment->update([
                        'status' => 'paid',
                        'val_id' => $valId,
                        'card_type' => $cardType,
                        'raw_response' => $request->all(),
                    ]);
                }

                $order->update([
                    'payment_status' => 'paid',
                    'status' => 'processing',
                ]);

                $order->user->notify(new PaymentSuccessfulNotification($order));
            });

            return response()->json(['message' => 'IPN Processed Successfully']);
        }

        return response()->json(['message' => 'IPN Validation Failed'], 400);
    }
}
