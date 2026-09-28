<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
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
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'image_url' => $this->image_path ? asset('storage/' . $this->image_path) : null,
            'price' => $this->price / 100,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'created_at' => $this->created_at->toDateTimeString(),
        ];
    }
}
