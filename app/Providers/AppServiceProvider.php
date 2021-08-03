<?php

namespace App\Providers;

use App\Services\VocabularyInterface;
use App\Services\VocabularyService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;

use Laravel\Passport\Passport;
use function GuzzleHttp\Promise\queue;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        $this->app->singleton(VocabularyInterface::class, VocabularyService::class);
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        DB::listen(function ($query) {
            // dump(
            //     $query->sql,
            //     $query->bindings,
            //     $query->time
            // );
        });
    }
}
