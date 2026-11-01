<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\Question;
use App\Models\User;
use App\Notifications\EmailVerificationCodeNotification;
use App\Services\EmailVerificationCodeService;
use App\Services\ImageService;
use App\Services\OrderInventoryService;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminController extends Controller
{
    private const LOW_STOCK_THRESHOLD = 5;

    public function dashboard()
    {
        $lowStock = Product::query()
            ->with('category')
            ->where('stock', '<=', self::LOW_STOCK_THRESHOLD)
            ->orderBy('stock')
            ->limit(6)
            ->get();

        return response()->json([
            'today_orders' => Order::query()->whereDate('created_at', today())->count(),
            'pending_orders' => Order::query()->where('status', 'pending')->count(),
            'total_sales' => Order::query()->where('payment_status', 'paid')->sum('total_amount'),
            'low_stock_count' => Product::query()
                ->where('stock', '<=', self::LOW_STOCK_THRESHOLD)
                ->count(),
            'low_stock_products' => ProductResource::collection($lowStock)->resolve(),
        ]);
    }

    public function products(Request $request)
    {
        $validated = $request->validate([
            'search' => 'nullable|string|max:255',
            'category_id' => 'nullable|integer|exists:categories,id',
            'stock' => 'nullable|in:low,in_stock,out_of_stock',
            'page' => 'nullable|integer|min:1',
        ]);

        $products = Product::query()
            ->with('category')
            ->when($validated['search'] ?? null, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($validated['category_id'] ?? null, fn ($query, $categoryId) => $query->where('category_id', $categoryId))
            ->when(($validated['stock'] ?? null) === 'low', fn ($query) => $query->where('stock', '<=', self::LOW_STOCK_THRESHOLD))
            ->when(($validated['stock'] ?? null) === 'in_stock', fn ($query) => $query->where('stock', '>', 0))
            ->when(($validated['stock'] ?? null) === 'out_of_stock', fn ($query) => $query->where('stock', 0))
            ->latest()
            ->paginate(12)
            ->withQueryString();

        return ProductResource::collection($products);
    }

    public function categories()
    {
        return Category::query()
            ->withCount('products')
            ->orderBy('name')
            ->paginate(20);
    }

    public function orders(Request $request)
    {
        $validated = $request->validate([
            'status' => 'nullable|in:pending,processing,completed,cancelled,failed',
            'payment_status' => 'nullable|in:pending,paid,failed,refunded',
            'page' => 'nullable|integer|min:1',
        ]);

        $orders = Order::query()
            ->with(['user:id,name,email', 'items.product:id,name,image_path', 'payments', 'latestPayment'])
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($validated['payment_status'] ?? null, fn ($query, $status) => $query->where('payment_status', $status))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return $this->orderPaginator($orders);
    }

    public function showOrder(Order $order)
    {
        return response()->json($this->orderData(
            $order->load(['user:id,name,email', 'items.product:id,name,image_path', 'payments', 'latestPayment']),
        ));
    }

    public function orderOptions()
    {
        return response()->json([
            'customers' => User::query()
                ->whereHas('roles', fn ($query) => $query->where('name', 'customer'))
                ->orderBy('name')
                ->get(['id', 'name', 'email']),
            'products' => Product::query()
                ->orderBy('name')
                ->get(['id', 'name', 'price', 'discount_price', 'stock']),
        ]);
    }

    public function createOrder(Request $request, OrderInventoryService $inventory)
    {
        $validated = $this->validateOrder($request);

        return DB::transaction(function () use ($validated, $inventory) {
            $customer = $this->customerForOrder($validated['user_id']);
            [$items, $totalAmount, $discountAmount] = $this->priceOrderItems(
                $validated['items'],
                $validated['delivery_charge'],
            );

            $order = Order::create([
                'user_id' => $customer->id,
                'order_number' => 'ORD-'.strtoupper(Str::random(10)),
                'total_amount' => $totalAmount,
                'discount_amount' => $discountAmount,
                'delivery_charge' => $validated['delivery_charge'],
                'status' => $validated['status'] ?? 'pending',
                'payment_status' => 'pending',
                'payment_method' => $validated['payment_method'] ?? 'online',
                'stock_reserved' => false,
                'shipping_address' => $validated['shipping_address'],
            ]);
            $order->items()->createMany($items);
            $inventory->synchronizeReservation($order);

            return response()->json($this->orderData(
                $order->load(['user:id,name,email', 'items.product:id,name,image_path', 'payments', 'latestPayment']),
            ), 201);
        });
    }

    public function updateOrder(Request $request, Order $order, OrderInventoryService $inventory)
    {
        $validated = $this->validateOrder($request, true);

        return DB::transaction(function () use ($validated, $order, $inventory) {
            $order = Order::query()->lockForUpdate()->findOrFail($order->id);
            $inventory->release($order);
            $customer = $this->customerForOrder($validated['user_id']);
            [$items, $totalAmount, $discountAmount] = $this->priceOrderItems(
                $validated['items'],
                $validated['delivery_charge'],
            );

            $order->update([
                'user_id' => $customer->id,
                'total_amount' => $totalAmount,
                'discount_amount' => $discountAmount,
                'delivery_charge' => $validated['delivery_charge'],
                'status' => $validated['status'],
                'shipping_address' => $validated['shipping_address'],
            ]);
            $order->items()->delete();
            $order->items()->createMany($items);
            $inventory->synchronizeReservation($order);

            return response()->json($this->orderData(
                $order->load(['user:id,name,email', 'items.product:id,name,image_path', 'payments', 'latestPayment']),
            ));
        });
    }

    public function questions()
    {
        $questions = Question::query()
            ->with(['user:id,name,email', 'product:id,name'])
            ->whereNull('answer')
            ->latest()
            ->paginate(15);

        return response()->json([
            'data' => $questions->getCollection()->map(fn (Question $question) => [
                'id' => $question->id,
                'question' => $question->question,
                'created_at' => $question->created_at,
                'user' => [
                    'name' => $question->user->name,
                    'email' => $question->user->email,
                ],
                'product' => [
                    'id' => $question->product->id,
                    'name' => $question->product->name,
                ],
            ]),
            'meta' => [
                'current_page' => $questions->currentPage(),
                'last_page' => $questions->lastPage(),
                'per_page' => $questions->perPage(),
                'total' => $questions->total(),
            ],
        ]);
    }

    public function users(Request $request)
    {
        $validated = $request->validate([
            'search' => 'nullable|string|max:255',
            'page' => 'nullable|integer|min:1',
        ]);

        $users = User::query()
            ->with('roles:id,name')
            ->when($validated['search'] ?? null, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => $users->getCollection()->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames(),
                'email_verified_at' => $user->email_verified_at,
                'created_at' => $user->created_at,
            ]),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function createUser(Request $request, EmailVerificationCodeService $verificationCodes)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'role' => ['required', 'string', Rule::in(['admin', 'customer'])],
            'password' => 'required|string|min:8|confirmed',
        ]);

        [$user, $code] = DB::transaction(function () use ($validated, $verificationCodes) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
            ]);
            $user->assignRole($validated['role']);
            $user->forceFill(['verification_purpose' => 'email_verification'])->save();

            $code = $verificationCodes->issue($user);

            return [$user, $code];
        });

        $user->notify(new EmailVerificationCodeNotification($code));

        return response()->json([
            'message' => 'User created. An email verification code has been sent to the user.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames(),
                'email_verified_at' => $user->email_verified_at,
                'created_at' => $user->created_at,
            ],
        ], 201);
    }

    public function verifyUserEmail(Request $request, User $user)
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:6', 'regex:/^(?=.*[A-Z])(?=.*[0-9])[A-Z0-9]{6}$/'],
        ]);

        return DB::transaction(function () use ($validated, $user) {
            $user = User::query()->lockForUpdate()->findOrFail($user->getKey());

            if ($user->hasVerifiedEmail()) {
                return response()->json(['message' => 'Email address is already verified.'], 400);
            }

            if ($user->verification_purpose !== 'email_verification') {
                return response()->json([
                    'message' => 'This account does not have a pending email verification.',
                ], 422);
            }

            if ($user->verification_attempts >= 5) {
                return response()->json([
                    'message' => 'Too many incorrect codes. Request a new code to try again.',
                ], 429);
            }

            if (! $user->verification_code_expires_at || $user->verification_code_expires_at->isPast()) {
                return response()->json([
                    'message' => 'This verification code has expired. Request a new code.',
                ], 422);
            }

            if (! $user->verification_code_hash || ! Hash::check($validated['code'], $user->verification_code_hash)) {
                $user->increment('verification_attempts');

                return response()->json([
                    'message' => $user->verification_attempts >= 5
                        ? 'Too many incorrect codes. Request a new code.'
                        : 'The verification code is incorrect.',
                ], $user->verification_attempts >= 5 ? 429 : 422);
            }

            $user->forceFill([
                'email_verified_at' => now(),
                'verification_code_hash' => null,
                'verification_code_expires_at' => null,
                'verification_attempts' => 0,
                'verification_purpose' => null,
            ])->save();

            event(new Verified($user));

            return response()->json([
                'message' => 'The user email address has been verified.',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $user->getRoleNames(),
                    'email_verified_at' => $user->email_verified_at,
                    'created_at' => $user->created_at,
                ],
            ]);
        });
    }

    private function orderPaginator($orders)
    {
        return response()->json([
            'data' => $orders->getCollection()->map(fn (Order $order) => $this->orderData($order)),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    private function validateOrder(Request $request, bool $updating = false): array
    {
        return $request->validate([
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')],
            'status' => [$updating ? 'required' : 'sometimes', 'in:pending,processing,completed,cancelled,failed'],
            'payment_method' => [$updating ? 'prohibited' : 'sometimes', 'in:online,cod'],
            'delivery_charge' => 'required|integer|min:0|max:2147483647',
            'shipping_address' => 'required|array:street,city,postal_code,country,phone',
            'shipping_address.street' => 'required|string|max:255',
            'shipping_address.city' => 'required|string|max:255',
            'shipping_address.postal_code' => 'required|string|max:50',
            'shipping_address.country' => 'required|string|in:Bangladesh,BD',
            'shipping_address.phone' => 'required|string|max:50',
            'items' => 'required|array|min:1',
            'items.*' => 'required|array:product_id,quantity',
            'items.*.product_id' => ['required', 'integer', Rule::exists('products', 'id')],
            'items.*.quantity' => 'required|integer|min:1|max:2147483647',
            'payment_status' => 'prohibited',
            'total_amount' => 'prohibited',
            'items.*.unit_price' => 'prohibited',
            'items.*.subtotal' => 'prohibited',
        ]);
    }

    private function customerForOrder(int|string $userId): User
    {
        $customer = User::query()->findOrFail($userId);

        if (! $customer->hasRole('customer')) {
            throw ValidationException::withMessages([
                'user_id' => 'Orders can only be assigned to customer accounts.',
            ]);
        }

        return $customer;
    }

    private function priceOrderItems(array $requestedItems, int $deliveryCharge): array
    {
        $products = Product::query()
            ->whereIn('id', collect($requestedItems)->pluck('product_id')->unique())
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        $items = [];
        $itemsTotal = 0;
        $discountTotal = 0;
        $maximumAmount = 2147483647;

        foreach ($requestedItems as $requestedItem) {
            $product = $products->get($requestedItem['product_id']);
            $quantity = (int) $requestedItem['quantity'];

            if (! $product) {
                throw ValidationException::withMessages([
                    'items' => 'One or more selected products are no longer available.',
                ]);
            }

            $unitPrice = $product->discount_price ?? $product->price;
            if ($unitPrice > intdiv($maximumAmount, $quantity)) {
                throw ValidationException::withMessages([
                    'items' => 'The order total exceeds the supported amount.',
                ]);
            }

            $itemDiscount = ($product->price - $unitPrice) * $quantity;
            if ($discountTotal > $maximumAmount - $itemDiscount) {
                throw ValidationException::withMessages([
                    'items' => 'The order discount exceeds the supported amount.',
                ]);
            }
            $discountTotal += $itemDiscount;
            $subtotal = $unitPrice * $quantity;

            if ($itemsTotal > $maximumAmount - $subtotal) {
                throw ValidationException::withMessages([
                    'items' => 'The order total exceeds the supported amount.',
                ]);
            }

            $itemsTotal += $subtotal;
            $items[] = [
                'product_id' => $product->id,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'subtotal' => $subtotal,
            ];
        }

        if ($itemsTotal > $maximumAmount - $deliveryCharge) {
            throw ValidationException::withMessages([
                'delivery_charge' => 'The order total exceeds the supported amount.',
            ]);
        }

        return [$items, $itemsTotal + $deliveryCharge, $discountTotal];
    }

    private function orderData(Order $order): array
    {
        return [
            'id' => $order->id,
            'user_id' => $order->user_id,
            'order_number' => $order->order_number,
            'total_amount' => $order->total_amount,
            'discount_amount' => $order->discount_amount,
            'delivery_charge' => $order->delivery_charge,
            'status' => $order->status,
            'payment_status' => $order->payment_status,
            'payment_method' => $order->payment_method,
            'shipping_address' => $order->shipping_address,
            'created_at' => $order->created_at,
            'user' => [
                'name' => $order->user->name,
                'email' => $order->user->email,
            ],
            'items' => $order->items->map(fn ($item) => [
                'id' => $item->id,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'subtotal' => $item->subtotal,
                'product' => [
                    'id' => $item->product?->id,
                    'name' => $item->product?->name ?? 'Removed product',
                    'image_url' => ImageService::url($item->product?->image_path),
                ],
            ]),
            'payments' => $order->payments->map(fn ($payment) => [
                'id' => $payment->id,
                'gateway' => $payment->gateway,
                'transaction_id' => $payment->transaction_id,
                'amount' => $payment->amount,
                'currency' => $payment->currency,
                'status' => $payment->status,
                'created_at' => $payment->created_at,
            ]),
            'latest_payment' => $order->latestPayment ? [
                'gateway' => $order->latestPayment->gateway,
                'transaction_id' => $order->latestPayment->transaction_id,
                'status' => $order->latestPayment->status,
            ] : null,
        ];
    }
}
