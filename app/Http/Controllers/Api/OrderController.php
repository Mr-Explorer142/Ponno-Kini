<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Product;
use App\Services\OrderInventoryService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $orders = $request->user()
            ->orders()
            ->with('items.product')
            ->latest()
            ->paginate(10);

        return OrderResource::collection($orders);
    }

    public function store(Request $request, OrderInventoryService $inventory)
    {
        $validated = $request->validate([
            'shipping_address' => 'required|array:street,city,postal_code,country,phone',
            'shipping_address.street' => 'required|string|max:255',
            'shipping_address.city' => 'required|string|max:255',
            'shipping_address.postal_code' => 'required|string|max:50',
            'shipping_address.country' => 'required|string|in:Bangladesh,BD',
            'shipping_address.phone' => 'required|string|max:50',
            'payment_method' => 'sometimes|required|in:online,cod',
            'items' => 'required|array|min:1',
            'items.*' => 'required|array:product_id,quantity,price',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1|max:2147483647',
            'payment_status' => 'prohibited',
            'total_amount' => 'prohibited',
            'delivery_charge' => 'prohibited',
            'items.*.unit_price' => 'prohibited',
            'items.*.subtotal' => 'prohibited',
        ]);

        return DB::transaction(function () use ($request, $validated, $inventory) {
            $totalAmount = 0;
            $discountAmount = 0;
            $orderItemsData = [];

            $productIds = collect($validated['items'])->pluck('product_id')->unique();
            $products = Product::query()
                ->whereIn('id', $productIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            foreach ($validated['items'] as $item) {
                $product = $products->get($item['product_id']);
                if (! $product) {
                    abort(422, 'One or more selected products are no longer available.');
                }

                $unitPrice = $product->discount_price ?? $product->price;
                if ($unitPrice > intdiv(2147483647, $item['quantity'])) {
                    abort(422, 'The order total exceeds the supported amount.');
                }
                $itemDiscount = ($product->price - $unitPrice) * $item['quantity'];
                if ($discountAmount > 2147483647 - $itemDiscount) {
                    abort(422, 'The order discount exceeds the supported amount.');
                }
                $discountAmount += $itemDiscount;
                $subtotal = $unitPrice * $item['quantity'];
                if ($totalAmount > 2147483647 - $subtotal) {
                    abort(422, 'The order total exceeds the supported amount.');
                }
                $totalAmount += $subtotal;

                $orderItemsData[] = [
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $unitPrice,
                    'subtotal' => $subtotal,
                ];
            }

            $deliveryCharge = strcasecmp(trim($validated['shipping_address']['city']), 'Dhaka') === 0
                ? 70
                : 120;
            if ($totalAmount > 2147483647 - $deliveryCharge) {
                abort(422, 'The order total exceeds the supported amount.');
            }
            $totalAmount += $deliveryCharge;

            $request->user()->update(['address' => $validated['shipping_address']]);

            // creating master order
            $order = Order::create([
                'user_id' => $request->user()->id,
                'order_number' => 'ORD-'.strtoupper(Str::random(10)),
                'total_amount' => $totalAmount,
                'discount_amount' => $discountAmount,
                'delivery_charge' => $deliveryCharge,
                'status' => 'pending',
                'payment_status' => 'pending',
                'payment_method' => $validated['payment_method'] ?? 'online',
                'stock_reserved' => false,
                'shipping_address' => $validated['shipping_address'],
            ]);

            $order->items()->createMany($orderItemsData);
            $inventory->reserve($order);

            return response()->json(new OrderResource($order->load('items.product')), 201);

        });

    }

    public function show(Request $request, Order $order)
    {
        if ($request->user()->cannot('view', $order) && ! $request->user()->hasRole('admin') && $order->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized access to order'], 403);
        }

        return response()->json(new OrderResource($order->load('items.product')));
    }

    public function updateStatus(Request $request, Order $order, OrderInventoryService $inventory)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,processing,completed,cancelled,failed',
        ]);

        $order = DB::transaction(function () use ($order, $validated, $inventory) {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($order->id);
            $lockedOrder->update(['status' => $validated['status']]);
            $inventory->synchronizeReservation($lockedOrder);

            return $lockedOrder;
        });

        return response()->json([
            'message' => 'Order status updated successfully!',
            'order' => new OrderResource($order),
        ]);
    }

    public function downloadInvoice(Request $request, Order $order)
    {
        if ($request->user()->cannot('view', $order) && ! $request->user()->hasRole('admin') && $order->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized access to invoice.'], 403);
        }

        $order->load(['user', 'items.product']);

        $pdf = Pdf::setOptions([
            'isHtml5ParserEnabled' => true,
        ])->loadView('invoices.order', ['order' => $order]);

        return $pdf->download("Invoice-{$order->order_number}.pdf");
    }
}
