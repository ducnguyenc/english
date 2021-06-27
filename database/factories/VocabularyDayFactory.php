<?php

namespace Database\Factories;

use App\Models\VocabularyDay;
use Illuminate\Database\Eloquent\Factories\Factory;

class VocabularyDayFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = VocabularyDay::class;

    /**
     * Define the model's default state.
     *
     * @return array
     */
    public function definition()
    {
        return [
            'english' => $this->faker->name,
            'spell' => $this->faker->name,
            'vietnamese' => $this->faker->name,
        ];
    }
}
