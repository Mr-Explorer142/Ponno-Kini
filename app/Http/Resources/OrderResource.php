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
            'total_amount' => $this->total_amount / 100,
            'status' => $this->status,
            'payment_status' => $this->payment_status,
            'shipping_address' => $this->shipping_address,
            'transaction_id' => $this->transaction_id,
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at->toDateTimeString(),
        ];
    }
}
