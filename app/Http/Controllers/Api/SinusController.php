<?php

namespace App\Http\Controllers\Api;

use App\Models\Sinus;
use App\Http\Controllers\Controller;
use App\Models\Drug;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SinusController extends Controller
{
    public function index()
    {
        $sinuses = Sinus::query()->orderBy('day_examination', 'desc')->get();
        $data = [];
        foreach ($sinuses as $sinus) {
            $drug = $sinus->drugs()->get()->toArray();
            $data[] = array_merge($sinus->toArray(), ['drugs' => $drug]);
        }

        return response()->json($data);
    }

    public function store(Request $request)
    {
        $params = $request->all();
        $drugParams = array_intersect_key($params, ['drug' => '']);
        $sinusParams = array_diff_key($params, ['drug' => '']);

        DB::beginTransaction();
        $sinus = Sinus::create($sinusParams);
        if (isset($sinus)) {
            foreach ($drugParams as $drugs) {
                foreach ($drugs as $drug) {
                    $drug['sinus_id'] = $sinus->id;
                    Drug::create($drug);
                }
            }
        }
        DB::commit();
    }

    public function destroy($id)
    {
        Sinus::destroy($id);
        Drug::where('sinus_id', $id)->delete();
    }
}
