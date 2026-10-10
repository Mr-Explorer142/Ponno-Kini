<?php

namespace App\Http\Resources;

use App\Services\ImageService;
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
            'image_url' => ImageService::url($this->image_path),
            'price' => $this->price,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'average_rating' => $this->average_rating,
            'reviews' => ReviewResource::collection($this->whenLoaded('reviews')),
            'questions' => QuestionResource::collection($this->whenLoaded('questions')),
            'created_at' => $this->created_at->toDateTimeString(),
        ];
    }
}
