<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->integer('discount_price')->nullable();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->integer('discount_amount')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('discount_amount');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('discount_price');
        });
    }
};
