<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JpVocabulary extends Model
{
    use HasFactory;

    protected $table = 'jp_vocabularies';
    protected $fillable = [
        'japanese',
        'spell',
        'vietnamese',
        'example',
        'day',
        'status',
    ];
    protected $casts = [
        'japanese' => 'string',
        'spell' => 'array',
        'vietnamese' => 'string',
        'example' => 'string',
        'day' => 'integer',
        'status' => 'integer',
    ];
}
