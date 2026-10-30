<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('verification_code_hash')->nullable();
            $table->timestamp('verification_code_expires_at')->nullable();
            $table->timestamp('verification_code_sent_at')->nullable();
            $table->unsignedTinyInteger('verification_attempts')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'verification_code_hash',
                'verification_code_expires_at',
                'verification_code_sent_at',
                'verification_attempts',
            ]);
        });
    }
};
