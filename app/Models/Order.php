<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    public const CASH_ON_DELIVERY = 'cod';

    public const PAID_PAYMENT_STATUS = 'paid';

    public const REVENUE_COMPLETED_STATUS = 'completed';

    public const EXCLUDED_REVENUE_STATUSES = ['cancelled', 'failed'];

    protected $fillable = [
        'user_id',
        'order_number',
        'total_amount',
        'discount_amount',
        'delivery_charge',
        'status',
        'payment_status',
        'payment_method',
        'stock_reserved',
        'shipping_address',
    ];

    protected $casts = [
        'shipping_address' => 'array',
        'stock_reserved' => 'boolean',
    ];

    public function scopeValid(Builder $query): Builder
    {
        return $query
            ->whereNotIn('orders.status', self::EXCLUDED_REVENUE_STATUSES)
            ->where(function (Builder $query) {
                $query
                    ->where('orders.payment_method', self::CASH_ON_DELIVERY)
                    ->orWhere('orders.payment_status', self::PAID_PAYMENT_STATUS);
            });
    }

    public function scopeRevenue(Builder $query): Builder
    {
        return $query
            ->valid()
            ->where(function (Builder $query) {
                $query
                    ->where('orders.payment_status', self::PAID_PAYMENT_STATUS)
                    ->orWhere('orders.status', self::REVENUE_COMPLETED_STATUS);
            });
    }

    public function scopeToProcess(Builder $query): Builder
    {
        return $query->where(function (Builder $query) {
            $query
                ->where('orders.status', 'processing')
                ->orWhere(function (Builder $query) {
                    $query
                        ->where('orders.payment_method', self::CASH_ON_DELIVERY)
                        ->where('orders.status', 'pending');
                });
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function latestPayment()
    {
        return $this->hasOne(Payment::class)->latestOfMany();
    }
}
