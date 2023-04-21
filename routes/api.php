<?php

use App\Http\Controllers\Api\SinusController;
use App\Http\Controllers\Api\VocabularyController;
use App\Http\Controllers\Api\Jp\VocabularyController as JpVocabularyController;
use App\Http\Controllers\FlirtController;
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

// Route::middleware(['auth:sanctum'])->group(function () {
    Route::prefix('english')->group(function () {
        Route::name('english.')->group(function () {
            Route::resource('vocabulary', VocabularyController::class)->only(['index', 'store', 'destroy', 'show', 'update']);
            Route::post('vocabulary/forward', [VocabularyController::class, 'forward'])->name('vocabulary.forward');
            Route::post('vocabulary/delete', [VocabularyController::class, 'delete'])->name('vocabulary.delete');
        });

    });

    Route::prefix('japanese')->group(function () {
        Route::name('japanese.')->group(function () {
            Route::resource('vocabulary', JpVocabularyController::class)->only(['index', 'store', 'destroy', 'show', 'update']);
            Route::post('vocabulary/forward', [JpVocabularyController::class, 'forward'])->name('vocabulary.forward');
            Route::post('vocabulary/delete', [JpVocabularyController::class, 'delete'])->name('vocabulary.delete');
        });
    });

    Route::prefix('flirt')->group(function () {
        Route::name('flirt.')->group(function () {
            Route::resource('flirt', FlirtController::class)->only(['index', 'store', 'destroy']);

            Route::get('typeIndex', [FlirtController::class, 'typeIndex']);
            Route::post('typeStore', [FlirtController::class, 'typeStore']);
            Route::delete('destroyType/{id}', [FlirtController::class, 'destroyType']);

            Route::get('categoryIndex', [FlirtController::class, 'categoryIndex']);
            Route::post('categoryStore', [FlirtController::class, 'categoryStore']);
            Route::delete('destroyCategory/{id}', [FlirtController::class, 'destroyCategory']);
        });
    });

    Route::prefix('sick')->group(function () {
        Route::name('sick.')->group(function () {
            Route::resource('sinus', SinusController::class)->only(['index', 'store', 'destroy']);
        });
    });
// });

Route::fallback(function () {
    return redirect()->route('english.vocabulary.index');
});
