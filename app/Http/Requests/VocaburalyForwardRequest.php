<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class VocaburalyForwardRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'idVocabulary' => 'bail|required|array',
            'idVocabulary.*' => 'bail|required|string',
            'day' => 'bail|required|string',
        ];
    }
}
