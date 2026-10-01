<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('order_number')->unique();
            $table->integer('total_amount'); // Price in cents
            $table->string('status')->default('pending'); // pending, processing, completed, cancelled, failed
            $table->string('payment_status')->default('pending'); // pending, paid, failed, refunded
            $table->json('shipping_address');
            $table->string('transaction_id')->nullable()->unique(); // For SSLCommerz
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
