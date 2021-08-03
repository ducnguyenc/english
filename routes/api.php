<?php

use App\Http\Controllers\Api\VocabularyController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

// Route::middleware(['throttle:vocabulary'])->group(function () {
    Route::prefix('english')->group(function () {
        Route::name('english.')->group(function () {
            Route::resource('vocabulary', VocabularyController::class)->only(['index', 'store', 'destroy']);
            Route::post('vocabulary/forward', [VocabularyController::class, 'forward'])->name('vocabulary.forward');
            Route::post('vocabulary/delete', [VocabularyController::class, 'delete'])->name('vocabulary.delete');    
        });
    });
// });

Route::fallback(function () {
    return redirect()->route('english.vocabulary.index');
});
