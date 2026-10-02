<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\SSLCommerzService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    protected SSLCommerzService $sslCommerz;

    public function __construct(SSLCommerzService $sslCommerz)
    {
        $this->sslCommerz = $sslCommerz;
    }

    // 1. Initiate Payment Link for Order 💳
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
            return response()->json([
                'payment_url' => $result['GatewayPageURL'],
                'status'      => 'pending',
            ]);
        }

        return response()->json([
            'message' => 'Failed to generate SSLCommerz payment session.',
            'error'   => $result['failedreason'] ?? 'Gateway connection error',
        ], 500);
    }

    // 2. Success Redirect Callback 🟢
    public function success(Request $request)
    {
        $tranId = $request->input('tran_id');
        $valId  = $request->input('val_id');

        $order = Order::where('order_number', $tranId)->firstOrFail();

        if ($order->payment_status === 'paid') {
            return response()->json(['message' => 'Order payment already confirmed.']);
        }

        // Verify payment authenticity with SSLCommerz server
        if ($valId && $this->sslCommerz->validatePayment($valId)) {
            $order->update([
                'payment_status' => 'paid',
                'status'         => 'processing',
                'transaction_id' => $tranId,
            ]);

            return response()->json([
                'message'      => 'Payment successful!',
                'order_number' => $order->order_number,
                'status'       => 'paid',
            ]);
        }

        $order->update(['payment_status' => 'failed', 'status' => 'failed']);

        return response()->json(['message' => 'Payment validation failed.'], 400);
    }

    // 3. Fail Callback 🔴
    public function fail(Request $request)
    {
        $tranId = $request->input('tran_id');
        $order  = Order::where('order_number', $tranId)->first();

        if ($order) {
            $order->update(['payment_status' => 'failed', 'status' => 'failed']);
        }

        return response()->json(['message' => 'Payment failed.'], 400);
    }

    // 4. Cancel Callback 🟡
    public function cancel(Request $request)
    {
        $tranId = $request->input('tran_id');
        $order  = Order::where('order_number', $tranId)->first();

        if ($order) {
            $order->update(['payment_status' => 'cancelled', 'status' => 'cancelled']);
        }

        return response()->json(['message' => 'Payment cancelled by user.']);
    }

    // 5. IPN (Instant Payment Notification) Webhook 🔔
    public function ipn(Request $request)
    {
        $tranId = $request->input('tran_id');
        $valId  = $request->input('val_id');
        $status = $request->input('status');

        Log::info('SSLCommerz IPN Received', $request->all());

        $order = Order::where('order_number', $tranId)->first();

        if (!$order) {
            return response()->json(['message' => 'Order not found.'], 404);
        }

        if ($order->payment_status === 'paid') {
            return response()->json(['message' => 'IPN Processed: Already Paid']);
        }

        if ($status === 'VALID' && $valId && $this->sslCommerz->validatePayment($valId)) {
            $order->update([
                'payment_status' => 'paid',
                'status'         => 'processing',
                'transaction_id' => $tranId,
            ]);

            return response()->json(['message' => 'IPN Processed Successfully']);
        }

        $order->update(['payment_status' => 'failed', 'status' => 'failed']);

        return response()->json(['message' => 'IPN Validation Failed'], 400);
    }
}
