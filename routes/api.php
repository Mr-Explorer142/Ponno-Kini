<?php

use Illuminate\Http\Request;
use App\Http\Controllers\Api\CategoryController;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');


Route::apiResource('categories', CategoryController::class);

//Route::get('/categories', [CategoryController::class, 'index']);
//Route::post('/categories', [CategoryController::class, 'store']);
//Route::get('/categories', [CategoryController::class, 'show']);
