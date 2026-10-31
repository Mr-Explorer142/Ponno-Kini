<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Notifications\OrderCancelNotification;
use App\Services\OrderInventoryService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

#[Signature('app:cancel-abandoned-orders')]
#[Description('Command description')]
class CancelAbandonedOrders extends Command
{
    protected $signature = 'orders:cancel-abandoned';

    protected $description = 'Cancel pending orders that are older than 7 days.';

    /**
     * Execute the console command.
     */
    public function handle(OrderInventoryService $inventory)
    {
        $thresholdDate = now()->subDays(7);

        $abandonedOrders = Order::where('status', 'pending')
            ->where('payment_status', 'pending')
            ->where('created_at', '<', $thresholdDate)
            ->get();

        $count = 0;

        foreach ($abandonedOrders as $order) {
            $order = DB::transaction(function () use ($order, $inventory) {
                $order = Order::query()->lockForUpdate()->findOrFail($order->id);
                $order->update([
                    'status' => 'cancelled',
                    'payment_status' => 'cancelled',
                ]);
                $inventory->synchronizeReservation($order);

                return $order;
            });
            $count++;

            // Notifying user about his order cancellation
            $order->user->notify(new OrderCancelNotification($order));
        }

        Log::info("Abandoned Order Cleanup: Cancelled $count orders.");
        $this->info("Successfully cancelled $count abandoned orders.");
    }
}
