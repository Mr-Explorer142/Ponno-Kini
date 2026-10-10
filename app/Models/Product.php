<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = ['category_id', 'name', 'slug', 'description', 'image_path', 'price'];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class)->latest();
    }

    public function questions()
    {
        return $this->hasMany(Question::class)->latest();
    }

// Helper to get average rating quickly
    public function getAverageRatingAttribute()
    {
        return round($this->reviews()->avg('rating'), 1);
    }
}
