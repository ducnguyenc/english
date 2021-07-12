<?php
//
//use App\Http\Controllers\CheckOnlineController;
//use App\Http\Controllers\GeneralController;
//use App\Http\Controllers\VocabularyController;
//use Illuminate\Support\Facades\Route;
//
///*
//|--------------------------------------------------------------------------
//| Web Routes
//|--------------------------------------------------------------------------
//|
//| Here is where you can register web routes for your application. These
//| routes are loaded by the RouteServiceProvider within a group which
//| contains the "web" middleware group. Now create something great!
//|
//*/
//
Route::get('/', function () {
   return view('welcome');
});
//
//Route::get('/dashboard', function () {
//    return view('dashboard');
//})->middleware(['auth'])->name('dashboard');
//
//require __DIR__ . '/auth.php';
//
//Route::middleware('throttle:vocabulary')->group(function () {
//    Route::prefix('english')->group(function () {
//        Route::name('english.')->group(function () {
//            Route::resource('vocabulary', VocabularyController::class)->only(['index', 'store', 'destroy']);
//            Route::post('vocabulary/forward', [VocabularyController::class, 'forward'])->name('vocabulary.forward');
//            Route::get('vocabulary/mergesound/{day}', [VocabularyController::class, 'mergeSound'])
//                ->name('vocabulary.mergesound')->whereNumber('day');
//        });
//    });
//});
//
//Route::get('admin/checkonline', [CheckOnlineController::class, 'userOnlineStatus'])->middleware('auth');
//Route::resource('general', GeneralController::class)->except(['create', 'show', 'edit', 'update']);
//
//Route::fallback(function () {
//    return redirect()->route('english.vocabulary.index');
//});
