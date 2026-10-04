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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('transaction_id')->unique(); // Order number or gateway transaction reference
            $table->string('gateway')->default('sslcommerz'); // sslcommerz, bkash, stripe, etc.
            $table->integer('amount');
            $table->string('currency')->default('BDT');
            $table->string('status')->default('pending'); // pending, paid, failed, cancelled
            $table->string('val_id')->nullable(); // SSLCommerz validation ID
            $table->string('card_type')->nullable(); // VISA, Mastercard, BKASH-BKash, etc.
            $table->json('raw_response')->nullable(); // Audit log of gateway payload
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
