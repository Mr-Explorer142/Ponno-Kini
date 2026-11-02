<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    private const LOW_STOCK_THRESHOLD = 5;

    private const ORDER_STATUSES = ['pending', 'processing', 'completed', 'cancelled', 'failed'];

    private const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'cancelled'];

    private const PAYMENT_METHODS = ['cod', 'online'];

    private const SIGNUP_METHODS = ['email', 'google', 'github'];

    private const RATINGS = [1, 2, 3, 4, 5];

    public function summary(Request $request)
    {
        $days = $this->validatedDays($request);

        return $this->remember('summary', $days, function () use ($days) {
            [$start, $end, $previousStart] = $this->dateRange($days);

            $orders = DB::query()
                ->selectSub(
                    Order::query()->valid()
                        ->where('orders.created_at', '>=', $start)
                        ->where('orders.created_at', '<', $end)
                        ->selectRaw('COUNT(*)'),
                    'orders_value',
                )
                ->selectSub(
                    Order::query()->valid()
                        ->where('orders.created_at', '>=', $previousStart)
                        ->where('orders.created_at', '<', $start)
                        ->selectRaw('COUNT(*)'),
                    'orders_previous',
                )
                ->selectSub(
                    Order::query()->revenue()
                        ->where('orders.created_at', '>=', $start)
                        ->where('orders.created_at', '<', $end)
                        ->selectRaw('COALESCE(SUM(orders.total_amount), 0)'),
                    'revenue_value',
                )
                ->selectSub(
                    Order::query()->revenue()
                        ->where('orders.created_at', '>=', $previousStart)
                        ->where('orders.created_at', '<', $start)
                        ->selectRaw('COALESCE(SUM(orders.total_amount), 0)'),
                    'revenue_previous',
                )
                ->selectSub(
                    Order::query()->revenue()
                        ->where('orders.created_at', '>=', $start)
                        ->where('orders.created_at', '<', $end)
                        ->selectRaw('COUNT(*)'),
                    'revenue_orders_value',
                )
                ->selectSub(
                    Order::query()->revenue()
                        ->where('orders.created_at', '>=', $previousStart)
                        ->where('orders.created_at', '<', $start)
                        ->selectRaw('COUNT(*)'),
                    'revenue_orders_previous',
                )
                ->selectSub(
                    Order::query()->toProcess()->selectRaw('COUNT(*)'),
                    'orders_to_process',
                )
                ->first();

            $customers = DB::query()
                ->selectSub(
                    DB::table('users')
                        ->where('created_at', '>=', $start)
                        ->where('created_at', '<', $end)
                        ->selectRaw('COUNT(*)'),
                    'customers_value',
                )
                ->selectSub(
                    DB::table('users')
                        ->where('created_at', '>=', $previousStart)
                        ->where('created_at', '<', $start)
                        ->selectRaw('COUNT(*)'),
                    'customers_previous',
                )
                ->first();

            $inventory = DB::table('products')
                ->selectRaw(
                    'COALESCE(SUM(CASE WHEN stock BETWEEN ? AND ? THEN 1 ELSE 0 END), 0) as low_stock_products',
                    [1, self::LOW_STOCK_THRESHOLD],
                )
                ->selectRaw(
                    'COALESCE(SUM(CASE WHEN stock = ? THEN 1 ELSE 0 END), 0) as out_of_stock_products',
                    [0],
                )
                ->first();

            $revenue = (int) $orders->revenue_value;
            $previousRevenue = (int) $orders->revenue_previous;
            $revenueOrders = (int) $orders->revenue_orders_value;
            $previousRevenueOrders = (int) $orders->revenue_orders_previous;
            $averageOrderValue = $revenueOrders > 0 ? $revenue / $revenueOrders : 0;
            $previousAverageOrderValue = $previousRevenueOrders > 0
                ? $previousRevenue / $previousRevenueOrders
                : 0;

            return [
                'range_days' => $days,
                'revenue' => $this->metric($revenue, $previousRevenue),
                'orders' => $this->metric(
                    (int) $orders->orders_value,
                    (int) $orders->orders_previous,
                ),
                'average_order_value' => $this->metric(
                    $averageOrderValue,
                    $previousAverageOrderValue,
                ),
                'new_customers' => $this->metric(
                    (int) $customers->customers_value,
                    (int) $customers->customers_previous,
                ),
                'orders_to_process' => (int) $orders->orders_to_process,
                'low_stock_products' => (int) $inventory->low_stock_products,
                'out_of_stock_products' => (int) $inventory->out_of_stock_products,
            ];
        });
    }

    public function sales(Request $request)
    {
        $days = $this->validatedDays($request);

        return $this->remember('sales', $days, function () use ($days) {
            [$start, $end] = $this->dateRange($days);
            $rows = Order::query()
                ->valid()
                ->where('orders.created_at', '>=', $start)
                ->where('orders.created_at', '<', $end)
                ->selectRaw('DATE(orders.created_at) as date')
                ->selectRaw(
                    'COALESCE(SUM(CASE WHEN orders.payment_status = ? OR orders.status = ? THEN orders.total_amount ELSE 0 END), 0) as revenue',
                    [Order::PAID_PAYMENT_STATUS, Order::REVENUE_COMPLETED_STATUS],
                )
                ->selectRaw('COUNT(*) as orders')
                ->groupByRaw('DATE(orders.created_at)')
                ->get()
                ->keyBy('date');

            $series = [];
            foreach ($this->days($start, $days) as $date) {
                $row = $rows->get($date);
                $series[] = [
                    'date' => $date,
                    'revenue' => (int) ($row->revenue ?? 0),
                    'orders' => (int) ($row->orders ?? 0),
                ];
            }

            return ['range_days' => $days, 'series' => $series];
        });
    }

    public function ordersByStatus(Request $request)
    {
        $days = $this->validatedDays($request);

        return $this->remember('orders-by-status', $days, function () use ($days) {
            [$start, $end] = $this->dateRange($days);
            $counts = Order::query()
                ->where('orders.created_at', '>=', $start)
                ->where('orders.created_at', '<', $end)
                ->select('orders.status')
                ->selectRaw('COUNT(*) as count')
                ->groupBy('orders.status')
                ->pluck('count', 'status');

            return collect(self::ORDER_STATUSES)
                ->map(fn (string $status) => [
                    'status' => $status,
                    'count' => (int) ($counts->get($status) ?? 0),
                ])
                ->all();
        });
    }

    public function paymentMethods(Request $request)
    {
        $days = $this->validatedDays($request);

        return $this->remember('payment-methods', $days, function () use ($days) {
            [$start, $end] = $this->dateRange($days);
            $rows = Order::query()
                ->valid()
                ->where('orders.created_at', '>=', $start)
                ->where('orders.created_at', '<', $end)
                ->select('orders.payment_method')
                ->selectRaw('COUNT(*) as orders')
                ->selectRaw(
                    'COALESCE(SUM(CASE WHEN orders.payment_status = ? OR orders.status = ? THEN orders.total_amount ELSE 0 END), 0) as revenue',
                    [Order::PAID_PAYMENT_STATUS, Order::REVENUE_COMPLETED_STATUS],
                )
                ->groupBy('orders.payment_method')
                ->get()
                ->keyBy('payment_method');

            return collect(self::PAYMENT_METHODS)
                ->map(fn (string $method) => [
                    'method' => $method,
                    'orders' => (int) ($rows->get($method)->orders ?? 0),
                    'revenue' => (int) ($rows->get($method)->revenue ?? 0),
                ])
                ->all();
        });
    }

    public function paymentStatus(Request $request)
    {
        $days = $this->validatedDays($request);

        return $this->remember('payment-status', $days, function () use ($days) {
            [$start, $end] = $this->dateRange($days);
            $counts = Order::query()
                ->where('orders.created_at', '>=', $start)
                ->where('orders.created_at', '<', $end)
                ->select('orders.payment_status')
                ->selectRaw('COUNT(*) as count')
                ->groupBy('orders.payment_status')
                ->pluck('count', 'payment_status');

            return collect(self::PAYMENT_STATUSES)
                ->map(fn (string $status) => [
                    'status' => $status,
                    'count' => (int) ($counts->get($status) ?? 0),
                ])
                ->all();
        });
    }

    public function topProducts(Request $request)
    {
        $days = $this->validatedDays($request);

        return $this->remember('top-products', $days, function () use ($days) {
            [$start, $end] = $this->dateRange($days);

            return Order::query()
                ->revenue()
                ->join('order_items', 'orders.id', '=', 'order_items.order_id')
                ->join('products', 'order_items.product_id', '=', 'products.id')
                ->where('orders.created_at', '>=', $start)
                ->where('orders.created_at', '<', $end)
                ->select('products.id', 'products.name')
                ->selectRaw('SUM(order_items.quantity) as units')
                ->selectRaw('SUM(order_items.subtotal) as revenue')
                ->groupBy('products.id', 'products.name')
                ->orderByDesc('units')
                ->orderByDesc('revenue')
                ->limit(8)
                ->get()
                ->map(fn ($row) => [
                    'id' => (int) $row->id,
                    'name' => $row->name,
                    'units' => (int) $row->units,
                    'revenue' => (int) $row->revenue,
                ])
                ->all();
        });
    }

    public function salesByCategory(Request $request)
    {
        $days = $this->validatedDays($request);

        return $this->remember('sales-by-category', $days, function () use ($days) {
            [$start, $end] = $this->dateRange($days);

            return Order::query()
                ->revenue()
                ->join('order_items', 'orders.id', '=', 'order_items.order_id')
                ->join('products', 'order_items.product_id', '=', 'products.id')
                ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
                ->where('orders.created_at', '>=', $start)
                ->where('orders.created_at', '<', $end)
                ->selectRaw("COALESCE(categories.name, 'Uncategorized') as category")
                ->selectRaw('SUM(order_items.quantity) as units')
                ->selectRaw('SUM(order_items.subtotal) as revenue')
                ->groupBy('categories.name')
                ->orderByDesc('revenue')
                ->get()
                ->map(fn ($row) => [
                    'category' => $row->category,
                    'units' => (int) $row->units,
                    'revenue' => (int) $row->revenue,
                ])
                ->all();
        });
    }

    public function salesByCity(Request $request)
    {
        $days = $this->validatedDays($request);

        return $this->remember('sales-by-city', $days, function () use ($days) {
            [$start, $end] = $this->dateRange($days);
            $cityExpression = "LOWER(TRIM(JSON_UNQUOTE(JSON_EXTRACT(orders.shipping_address, '$.city'))))";
            $rows = Order::query()
                ->valid()
                ->where('orders.created_at', '>=', $start)
                ->where('orders.created_at', '<', $end)
                ->whereRaw("TRIM(JSON_UNQUOTE(JSON_EXTRACT(orders.shipping_address, '$.city'))) <> ''")
                ->selectRaw("{$cityExpression} as city_key")
                ->selectRaw('COUNT(*) as orders')
                ->selectRaw(
                    'COALESCE(SUM(CASE WHEN orders.payment_status = ? OR orders.status = ? THEN orders.total_amount ELSE 0 END), 0) as revenue',
                    [Order::PAID_PAYMENT_STATUS, Order::REVENUE_COMPLETED_STATUS],
                )
                ->groupByRaw($cityExpression)
                ->orderByDesc('revenue')
                ->orderByDesc('orders')
                ->limit(10)
                ->get();

            return $rows->map(fn ($row) => [
                'city' => mb_convert_case($row->city_key, MB_CASE_TITLE, 'UTF-8'),
                'orders' => (int) $row->orders,
                'revenue' => (int) $row->revenue,
            ])->all();
        });
    }

    public function newCustomers(Request $request)
    {
        $days = $this->validatedDays($request);

        return $this->remember('new-customers', $days, function () use ($days) {
            [$start, $end] = $this->dateRange($days);
            $methodExpression = "CASE WHEN provider = 'google' THEN 'google' WHEN provider = 'github' THEN 'github' ELSE 'email' END";
            $rows = DB::table('users')
                ->where('created_at', '>=', $start)
                ->where('created_at', '<', $end)
                ->selectRaw('DATE(created_at) as date')
                ->selectRaw("{$methodExpression} as method")
                ->selectRaw('COUNT(*) as count')
                ->groupByRaw("DATE(created_at), {$methodExpression}")
                ->get();

            $daily = [];
            $methods = array_fill_keys(self::SIGNUP_METHODS, 0);
            foreach ($rows as $row) {
                $daily[$row->date] = ($daily[$row->date] ?? 0) + (int) $row->count;
                if (array_key_exists($row->method, $methods)) {
                    $methods[$row->method] += (int) $row->count;
                }
            }

            $series = [];
            foreach ($this->days($start, $days) as $date) {
                $series[] = ['date' => $date, 'count' => $daily[$date] ?? 0];
            }

            return [
                'range_days' => $days,
                'series' => $series,
                'by_signup_method' => collect(self::SIGNUP_METHODS)
                    ->map(fn (string $method) => [
                        'method' => $method,
                        'count' => $methods[$method],
                    ])
                    ->all(),
            ];
        });
    }

    public function ratings(Request $request)
    {
        $days = $this->validatedDays($request);

        return $this->remember('ratings', $days, function () use ($days) {
            [$start, $end] = $this->dateRange($days);
            $counts = DB::table('reviews')
                ->where('created_at', '>=', $start)
                ->where('created_at', '<', $end)
                ->select('rating')
                ->selectRaw('COUNT(*) as count')
                ->groupBy('rating')
                ->pluck('count', 'rating');

            return collect(self::RATINGS)
                ->map(fn (int $rating) => [
                    'rating' => $rating,
                    'count' => (int) ($counts->get($rating) ?? 0),
                ])
                ->all();
        });
    }

    public function ordersHeatmap(Request $request)
    {
        $days = $this->validatedDays($request);

        return $this->remember('orders-heatmap', $days, function () use ($days) {
            [$start, $end] = $this->dateRange($days);
            $counts = Order::query()
                ->valid()
                ->where('orders.created_at', '>=', $start)
                ->where('orders.created_at', '<', $end)
                ->selectRaw('DAYOFWEEK(orders.created_at) - 1 as weekday')
                ->selectRaw('HOUR(orders.created_at) as hour')
                ->selectRaw('COUNT(*) as orders')
                ->groupByRaw('DAYOFWEEK(orders.created_at), HOUR(orders.created_at)')
                ->get()
                ->keyBy(fn ($row) => $row->weekday.':'.$row->hour);

            $heatmap = [];
            for ($weekday = 0; $weekday <= 6; $weekday++) {
                for ($hour = 0; $hour <= 23; $hour++) {
                    $heatmap[] = [
                        'weekday' => $weekday,
                        'hour' => $hour,
                        'orders' => (int) ($counts->get($weekday.':'.$hour)->orders ?? 0),
                    ];
                }
            }

            return $heatmap;
        });
    }

    private function validatedDays(Request $request): int
    {
        $validated = $request->validate([
            'days' => 'sometimes|in:7,30,90',
        ]);

        return (int) ($validated['days'] ?? 30);
    }

    private function remember(string $endpoint, int $days, callable $callback): mixed
    {
        return Cache::remember("admin:stats:{$endpoint}:{$days}", 60, $callback);
    }

    private function dateRange(int $days): array
    {
        $now = CarbonImmutable::now('Asia/Dhaka');
        $end = $now->startOfDay()->addDay();
        $start = $end->subDays($days);

        return [$start, $end, $start->subDays($days)];
    }

    private function days(CarbonImmutable $firstDay, int $days): array
    {
        $dates = [];
        for ($offset = 0; $offset < $days; $offset++) {
            $dates[] = $firstDay->addDays($offset)->toDateString();
        }

        return $dates;
    }

    private function metric(int|float $value, int|float $previous): array
    {
        return [
            'value' => $value,
            'previous' => $previous,
            'change_pct' => $previous == 0
                ? null
                : round((($value - $previous) / $previous) * 100, 1),
        ];
    }
}
