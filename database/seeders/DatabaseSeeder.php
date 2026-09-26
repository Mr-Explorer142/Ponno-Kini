<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Creating role
        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $customerRole = Role::firstOrCreate(['name' => 'customer', 'guard_name' => 'web']);

        // 2. Creating an admin user
        $admin = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'System Administrator',
                'password' => 'Admin@123456',
            ],
        );

        $admin->assignRole($adminRole);

        // 3. Seeding data
        Category::factory(5)->has(Product::factory()->count(10))->create();
    }
}
