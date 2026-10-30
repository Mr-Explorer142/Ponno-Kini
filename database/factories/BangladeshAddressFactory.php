<?php

namespace Database\Factories;

class BangladeshAddressFactory
{
    public static function examples(): array
    {
        return [
            [
                'street' => 'House 12, Road 7, Sector 4, Uttara',
                'city' => 'Dhaka',
                'postal_code' => '1230',
                'country' => 'Bangladesh',
                'phone' => '01700000001',
            ],
            [
                'street' => 'Arja Dattapara, Shibchar',
                'city' => 'Madaripur',
                'postal_code' => '7921',
                'country' => 'Bangladesh',
                'phone' => '01700000002',
            ],
            [
                'street' => 'House 18, Road 27, Dhanmondi',
                'city' => 'Dhaka',
                'postal_code' => '1209',
                'country' => 'Bangladesh',
                'phone' => '01700000003',
            ],
        ];
    }
}
