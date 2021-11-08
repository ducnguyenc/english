<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Sinus extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'hospital',
        'day_examination',
        'diagnose',
        'advice',
    ];

    protected $casts = [
        'day_examination' => 'datetime:d-m-Y'
    ];

    public function drugs()
    {
        return $this->hasMany(Drug::class);
    }
}
