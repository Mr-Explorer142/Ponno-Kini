<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('address')->nullable();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->integer('delivery_charge')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('delivery_charge');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('address');
        });
    }
};
