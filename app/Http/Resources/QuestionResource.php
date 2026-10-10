<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuestionResource extends JsonResource
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
            'user' => $this->user->name,
            'question' => $this->question,
            'answer' => $this->answer,
            'answered_by' => $this->answerer ? $this->answerer->name : null,
            'created_at' => $this->created_at->diffForHumans(),
            'answered_at' => $this->updated_at->diffForHumans(),
        ];
    }
}
