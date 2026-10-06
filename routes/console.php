<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('orders:cancel-abandoned')->dailyAt('00:00');
