<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'total_amount' => $this->total_amount,
            'discount_amount' => $this->discount_amount,
            'delivery_charge' => $this->delivery_charge,
            'status' => $this->status,
            'payment_status' => $this->payment_status,
            'payment_method' => $this->payment_method,
            'shipping_address' => $this->shipping_address,
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
            'latest_payment' => new PaymentResource($this->whenLoaded('latestPayment')),
            'created_at' => $this->created_at->toDateTimeString(),
        ];
    }
}
