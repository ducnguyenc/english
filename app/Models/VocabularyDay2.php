<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VocabularyDay2 extends Model
{
    use HasFactory;
    protected $fillable = [
        'english',
        'spell',
        'vietnamese',
    ];
    protected $cats = [
        'english' => 'string',
        'spell' => 'array',
        'vietnamese' => 'string',
    ];
}