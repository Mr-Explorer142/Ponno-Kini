<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Notifications\PaymentSuccessfulNotification;
use App\Services\SSLCommerzService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

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

        $transactionId = $order->order_number.'-'.Str::upper(Str::random(8));
        $result = $this->sslCommerz->initiatePayment($order, $transactionId);

        if (
            ($result['status'] ?? null) === 'SUCCESS'
            && filled($result['GatewayPageURL'] ?? null)
        ) {
            // Create pending record in payments table
            Payment::create([
                'order_id' => $order->id,
                'transaction_id' => $transactionId,
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

        $payment = Payment::where('transaction_id', $tranId)->latest()->first();
        abort_unless($payment, 404, 'Payment transaction not found.');
        $order = $payment->order;

        if ($order->payment_status === 'paid') {
            return redirect()->away($this->frontendResultUrl($order, 'success'));
        }

        if ($valId && $this->sslCommerz->validatePayment($valId, $tranId, $order->total_amount)) {
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

            return redirect()->away($this->frontendResultUrl($order, 'success'));
        }

        if ($payment && $payment->status !== 'paid') {
            $payment->update(['status' => 'failed', 'raw_response' => $request->all()]);
        }
        if ($order->payment_status !== 'paid') {
            $order->update(['payment_status' => 'failed', 'status' => 'failed']);
        }

        return redirect()->away($this->frontendResultUrl($order, 'failed'));
    }

    // 3. Fail Callback
    public function fail(Request $request)
    {
        $tranId = $request->input('tran_id');
        $payment = Payment::where('transaction_id', $tranId)->latest()->first();
        $order = $payment?->order;

        if ($payment && $payment->status !== 'paid') {
            $payment->update(['status' => 'failed', 'raw_response' => $request->all()]);
        }
        if ($order && $order->payment_status !== 'paid') {
            $order->update(['payment_status' => 'failed', 'status' => 'failed']);
        }

        return $order
            ? redirect()->away($this->frontendResultUrl($order, 'failed'))
            : response()->json(['message' => 'Payment failed.'], 400);
    }

    // 4. Cancel Callback
    public function cancel(Request $request)
    {
        $tranId = $request->input('tran_id');
        $payment = Payment::where('transaction_id', $tranId)->latest()->first();
        $order = $payment?->order;

        if ($payment && $payment->status !== 'paid') {
            $payment->update(['status' => 'cancelled', 'raw_response' => $request->all()]);
        }
        if ($order && $order->payment_status !== 'paid') {
            $order->update(['payment_status' => 'cancelled', 'status' => 'cancelled']);
        }

        return $order
            ? redirect()->away($this->frontendResultUrl($order, 'cancelled'))
            : response()->json(['message' => 'Payment cancelled by user.']);
    }

    // 5. IPN Webhook
    public function ipn(Request $request)
    {
        $tranId = $request->input('tran_id');
        $valId = $request->input('val_id');
        $status = $request->input('status');
        $cardType = $request->input('card_type');

        $payment = Payment::where('transaction_id', $tranId)->latest()->first();
        $order = $payment?->order;

        if (! $order) {
            return response()->json(['message' => 'Payment transaction not found.'], 404);
        }

        if ($order->payment_status === 'paid' || $payment->status === 'paid') {
            return response()->json(['message' => 'IPN Processed: Already Paid']);
        }

        if ($status === 'VALID' && $valId && $this->sslCommerz->validatePayment($valId, $tranId, $order->total_amount)) {
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

    private function frontendResultUrl(Order $order, string $result): string
    {
        return rtrim(config('app.frontend_url'), '/').'/order-result?order_id='.$order->id.'&payment='.$result;
    }
}
