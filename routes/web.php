<?php

use App\Http\Controllers\VocabularyController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function () {
    return view('welcome');
});

Route::resource('vocabulary', VocabularyController::class);
Route::post('vocabulary/forward', [VocabularyController::class, 'forward'])->name('vocabulary.forward');
Route::post('vocabulary/mergesound', [VocabularyController::class, 'mergeSound'])->name('vocabulary.mergesound');
