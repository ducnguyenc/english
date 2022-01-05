<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Flirt extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $appends = [
        'type',
        'category',
    ];

    protected $fillable = [
        'flirt_type_id',
        'flirt_category_id',
        'content',
        'link',
    ];

    protected $casts = [
        'flirt_type_id' => 'array',
        'flirt_category_id' => 'array',
        'content' => 'string',
        'link' => 'string',
    ];

    public function getTypeAttribute()
    {
        return FlirtType::whereIn('id', $this->flirt_type_id)->get('name')->implode('name', ',');
    }

    public function getCategoryAttribute()
    {
        return FlirtCategory::whereIn('id', $this->flirt_category_id)->get('name')->implode('name', ',');
    }
}
