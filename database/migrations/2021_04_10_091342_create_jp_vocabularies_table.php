<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateJpVocabulariesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('jp_vocabularies', function (Blueprint $table) {
            $table->id();
            $table->string('japanese');
            $table->json('spell');
            $table->string('vietnamese');
            $table->string('example')->nullable();
            $table->integer('status')->default(0);
            $table->integer('day');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('jp_vocabularies');
    }
}
