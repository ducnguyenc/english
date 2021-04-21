<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VocabularyDay3 extends Model
{
    use HasFactory;
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
}
