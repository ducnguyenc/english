<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VocabularyDay extends Model
{
    use HasFactory;

    protected $table = 'vocabulary_days';
    protected $fillable = [
        'english',
        'part_of_speech',
        'spell',
        'vietnamese',
        'example',
        'day',
        'status',
    ];
    protected $casts = [
        'english' => 'string',
        'spell' => 'array',
        'vietnamese' => 'string',
        'example' => 'string',
        'day' => 'integer',
        'status' => 'integer',
    ];
}
