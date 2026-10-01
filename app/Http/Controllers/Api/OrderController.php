<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Product;
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


    public function store(Request $request)
    {
        $validated = $request->validate([
            'shipping_address' => 'required|array',
            'shipping_address.street' => 'required|string',
            'shipping_address.city' => 'required|string',
            'shipping_address.postal_code' => 'required|string',
            'shipping_address.country' => 'required|string',
            'shipping_address.phone' => 'required|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        return DB::transaction(function () use ($request, $validated) {
            $totalAmount = 0;
            $orderItemsData = [];

            // Extracting products
            $productIds = collect($validated['items'])->pluck('product_id');
            $products = Product::whereIn('id', $productIds)->get()->keyBy('id');

            foreach ($validated['items'] as $item) {
                $product = $products->get($item['product_id']);

                $unitPrice = $product->price;
                $subtotal = $unitPrice * $item['quantity'];
                $totalAmount += $subtotal;

                $orderItemsData[] = [
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $unitPrice,
                    'subtotal' => $subtotal,
                ];
            }

            // creating master order
            $order = Order::create([
                'user_id' => $request->user()->id,
                'order_number' => 'ORD-' . strtoupper(Str::random(10)),
                'total_amount' => $totalAmount,
                'status' => 'pending',
                'payment_status' => 'pending',
                'shipping_address' => $validated['shipping_address'],
            ]);

            // Bulk insert Order Items
            foreach ($orderItemsData as $itemData) {
                $order->items()->create($itemData);
            }

            return response()->json(new OrderResource($order->load('items.product')), 201);

        });

    }

    public function show(Request $request, Order $order)
    {
        if ($request->user()->cannot('view', $order) && !$request->user()->hasRole('admin') && $order->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized access to order'], 403);
        }

        return response()->json(new OrderResource($order->load('items.product')));
    }

    public function updateStatus(Request $request, Order $order)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending, processing, completed, cancelled, failed',
        ]);

        $order->update(['status' => $validated['status']]);

        return response()->json([
            'message' => 'Order status updated successfully!',
            'order' => new OrderResource($order),
        ]);
    }

}
