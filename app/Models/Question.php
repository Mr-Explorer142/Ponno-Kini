<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    protected $fillable = ['product_id', 'user_id', 'question', 'answer', 'answered_by'];

    public function user()
    {
        return $this->belongsTo(User::class);
    } // Asker

    public function answerer()
    {
        return $this->belongsTo(User::class, 'answered_by');
    } // Admin

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
