<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VocabularyDay1 extends Model
{
    use HasFactory;

    protected $table = 'vocabulary_day1s';
    protected $fillable = [
        'english',
        'spell',
        'vietnamese',
    ];
    protected $casts = [
        'english' => 'string',
        'spell' => 'array',
        'vietnamese' => 'string',
    ];

    public function vocabulary2()
    {
        return $this->hasMany(VocabularyDay2::class, 'english', 'english');
    }
}
