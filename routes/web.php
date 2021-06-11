<?php

use App\Http\Controllers\GeneralController;
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

Route::middleware('throttle:vocabulary')->group(function () {
    Route::prefix('english')->group(function () {
        Route::name('english.')->group(function () {
            Route::resource('vocabulary', VocabularyController::class);
            Route::post('vocabulary/forward', [VocabularyController::class, 'forward'])->name('vocabulary.forward');
            Route::get('vocabulary/mergesound/{day}', [VocabularyController::class, 'mergeSound'])
                ->name('vocabulary.mergesound')->whereNumber('day');
        });
    });
});

Route::resource('general', GeneralController::class);

Route::fallback(function () {
    return redirect()->route('english.vocabulary.index');
});
