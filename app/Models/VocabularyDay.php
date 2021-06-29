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
        'spell',
        'vietnamese',
        'day',
        'status',
    ];
    protected $casts = [
        'english' => 'string',
        'spell' => 'array',
        'vietnamese' => 'string',
        'day' => 'integer',
        'status' => 'integer',
    ];
}
