<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Validation\ValidationException;

class OrderInventoryService
{
    private const UNRESERVED_STATUSES = ['cancelled', 'failed'];

    public function synchronizeReservation(Order $order): void
    {
        if (in_array($order->status, self::UNRESERVED_STATUSES, true)) {
            $this->release($order);

            return;
        }

        $this->reserve($order);
    }

    public function reserve(Order $order): void
    {
        if ($order->stock_reserved) {
            return;
        }

        $quantities = $this->itemQuantities($order);
        if ($quantities === []) {
            return;
        }

        $products = $this->lockedProducts($quantities);

        foreach ($quantities as $productId => $quantity) {
            $product = $products->get($productId);

            if (! $product || $product->stock < $quantity) {
                throw ValidationException::withMessages([
                    'items' => sprintf(
                        'Insufficient stock for %s. Available: %d.',
                        $product?->name ?? 'a selected product',
                        $product?->stock ?? 0,
                    ),
                ]);
            }
        }

        foreach ($quantities as $productId => $quantity) {
            $products->get($productId)->decrement('stock', $quantity);
        }

        $order->forceFill(['stock_reserved' => true])->save();
    }

    public function release(Order $order): void
    {
        if (! $order->stock_reserved) {
            return;
        }

        $quantities = $this->itemQuantities($order);
        $products = $this->lockedProducts($quantities);

        foreach ($quantities as $productId => $quantity) {
            $products->get($productId)?->increment('stock', $quantity);
        }

        $order->forceFill(['stock_reserved' => false])->save();
    }

    private function itemQuantities(Order $order): array
    {
        return $order->items()
            ->select('product_id')
            ->selectRaw('SUM(quantity) as quantity')
            ->groupBy('product_id')
            ->orderBy('product_id')
            ->pluck('quantity', 'product_id')
            ->map(fn ($quantity) => (int) $quantity)
            ->all();
    }

    private function lockedProducts(array $quantities)
    {
        if ($quantities === []) {
            return collect();
        }

        return Product::query()
            ->whereIn('id', array_keys($quantities))
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');
    }
}
