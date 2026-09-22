<?php

use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ProductController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');


Route::apiResource('categories', CategoryController::class);
Route::apiResource('products', ProductController::class);

//Route::get('/categories', [CategoryController::class, 'index']);
//Route::post('/categories', [CategoryController::class, 'store']);
//Route::get('/categories', [CategoryController::class, 'show']);
