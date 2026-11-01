<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Notifications\PaymentSuccessfulNotification;
use App\Services\OrderInventoryService;
use App\Services\SSLCommerzService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class PaymentController extends Controller
{
    protected SSLCommerzService $sslCommerz;

    public function __construct(SSLCommerzService $sslCommerz)
    {
        $this->sslCommerz = $sslCommerz;
    }

    // 1. Initiate Payment
    public function initiate(Request $request, Order $order, OrderInventoryService $inventory)
    {
        if ($order->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized order payment request.'], 403);
        }

        if ($order->payment_method !== 'online') {
            return response()->json(['message' => 'This order is not using online payment.'], 422);
        }

        if ($order->payment_status === 'paid') {
            return response()->json(['message' => 'Order is already paid.'], 400);
        }

        $order = DB::transaction(function () use ($order, $inventory) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);

            if (in_array($lockedOrder->status, ['cancelled', 'failed'], true)) {
                abort(422, 'This order is closed. Please create a new order to try again.');
            }

            $inventory->reserve($lockedOrder);

            return $lockedOrder;
        });

        $transactionId = $order->order_number . '-' . Str::upper(Str::random(8));
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
    public function success(Request $request, OrderInventoryService $inventory)
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

        // Gateway validation happens outside any DB transaction (network call)
        if ($valId && $this->sslCommerz->validatePayment($valId, $tranId, $order->total_amount)) {
            $this->markPaid($payment, $valId, $cardType, $request);

            return redirect()->away($this->frontendResultUrl($order, 'success'));
        }

        $this->markUnsuccessfulPayment($request, $tranId, 'failed', 'failed', $inventory);

        // The IPN webhook may have confirmed the payment in the meantime
        $order->refresh();
        $result = $order->payment_status === 'paid' ? 'success' : 'failed';

        return redirect()->away($this->frontendResultUrl($order, $result));
    }

    // 3. Fail Callback
    public function fail(Request $request, OrderInventoryService $inventory)
    {
        $tranId = $request->input('tran_id');
        $order = $this->markUnsuccessfulPayment($request, $tranId, 'failed', 'failed', $inventory);

        return $order
            ? redirect()->away($this->frontendResultUrl($order, 'failed'))
            : response()->json(['message' => 'Payment failed.'], 400);
    }

    // 4. Cancel Callback
    public function cancel(Request $request, OrderInventoryService $inventory)
    {
        $tranId = $request->input('tran_id');
        $order = $this->markUnsuccessfulPayment($request, $tranId, 'cancelled', 'cancelled', $inventory);

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
            $this->markPaid($payment, $valId, $cardType, $request);

            return response()->json(['message' => 'IPN Processed Successfully']);
        }

        return response()->json(['message' => 'IPN Validation Failed'], 400);
    }

    private function frontendResultUrl(Order $order, string $result): string
    {
        return rtrim(config('app.frontend_url'), '/') . '/order-result?order_id=' . $order->id . '&payment=' . $result;
    }

    /**
     * Marks a payment and its order as paid, exactly once.
     *
     * The success callback and the IPN webhook can arrive at the same time,
     * so both rows are locked and re-checked inside the transaction. The
     * notification is sent only AFTER the transaction commits, so a mail
     * failure can never roll back a payment the customer has already made.
     */
    private function markPaid(Payment $payment, string $valId, ?string $cardType, Request $request): bool
    {
        $order = DB::transaction(function () use ($payment, $valId, $cardType, $request) {
            // Lock order: payment first, then order (same as markUnsuccessfulPayment)
            $lockedPayment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($lockedPayment->order_id);

            if ($lockedPayment->status === 'paid' || $lockedOrder->payment_status === 'paid') {
                return null; // already processed by the other callback
            }

            $lockedPayment->update([
                'status' => 'paid',
                'val_id' => $valId,
                'card_type' => $cardType,
                'raw_response' => $request->all(),
            ]);

            $lockedOrder->update([
                'payment_status' => 'paid',
                'status' => 'processing',
            ]);

            return $lockedOrder;
        });

        if (! $order) {
            return false;
        }

        $this->notifyPaymentSuccess($order);

        return true;
    }

    private function notifyPaymentSuccess(Order $order): void
    {
        try {
            $order->loadMissing('user');
            $order->user?->notify(new PaymentSuccessfulNotification($order));
        } catch (Throwable $e) {
            Log::error('Payment success notification failed', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function markUnsuccessfulPayment(
        Request $request,
        ?string $transactionId,
        string $paymentStatus,
        string $orderStatus,
        OrderInventoryService $inventory,
    ): ?Order {
        if (! $transactionId) {
            return null;
        }

        return DB::transaction(function () use ($request, $transactionId, $paymentStatus, $orderStatus, $inventory) {
            $payment = Payment::query()
                ->where('transaction_id', $transactionId)
                ->latest()
                ->lockForUpdate()
                ->first();

            if (! $payment) {
                return null;
            }

            $order = Order::query()->lockForUpdate()->findOrFail($payment->order_id);

            if ($payment->status !== 'paid') {
                $payment->update([
                    'status' => $paymentStatus,
                    'raw_response' => $request->all(),
                ]);
            }

            if ($order->payment_status !== 'paid') {
                $order->update([
                    'payment_status' => $paymentStatus,
                    'status' => $orderStatus,
                ]);
                $inventory->synchronizeReservation($order);
            }

            return $order;
        });
    }
}
