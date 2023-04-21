<?php

namespace App\Http\Controllers\Api\Jp;

use App\Http\Controllers\Controller;
use App\Models\JpVocabulary as VocabularyDay;
use App\Models\JpVocabulary;
use App\Services\VocabularyInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VocabularyController extends Controller
{
    protected $vocabularyInterface;

    public function __construct(VocabularyInterface $vocabularyInterface)
    {
        $this->vocabularyInterface = $vocabularyInterface;
    }

    /**
     * Display a listing of the resource.
     *
     * @return false|\Illuminate\Contracts\View\View|string
     */
    public function index()
    {
        if (request()->status_shuffle) {
            $vocabularyDays = [
                '1' => VocabularyDay::where('day', 1)->get()->shuffle(),
                '2' => VocabularyDay::where('day', 2)->get()->shuffle(),
                '3' => VocabularyDay::where('day', 3)->get()->shuffle(),
                '4' => VocabularyDay::where('day', 4)->get()->shuffle(),
                '5' => VocabularyDay::where('day', 5)->get()->shuffle(),
            ];
        } else {
            $vocabularyDays = [
                '1' => VocabularyDay::where('day', 1)->get(),
                '2' => VocabularyDay::where('day', 2)->get(),
                '3' => VocabularyDay::where('day', 3)->get(),
                '4' => VocabularyDay::where('day', 4)->get(),
                '5' => VocabularyDay::where('day', 5)->get(),
            ];
        }
        return response()->json($vocabularyDays);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param \App\Http\Requests\VocaburalyRequest $request
     * @return \Illuminate\Routing\Redirector
     */
    public function store(Request $request)
    {
        $result = $this->vocabularyInterface->createJp($request->all());

        return response()->json($result);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param \Illuminate\Http\Request $request
     * @param \App\Models\VocabularyDay $vocabularyDay1
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, $id)
    {
        VocabularyDay::where('id', $id)->update([
            'japanese' => $request->japanese,
            'spell' => $request->spell,
            'vietnamese' => $request->vietnamese,
            'example' => $request->example,
        ]);
        return response()->json(['status' => 'ok']);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param \App\Models\VocabularyDay $vocabularyDay1
     * @return \Illuminate\Http\Response
     */
    public function destroy($id, Request $request)
    {
        try {
            DB::beginTransaction();
            $params = $request->all();
            $params['idVocabulary'] = [$id];
            $this->vocabularyInterface->deleteJp($params);
            DB::commit();
        } catch (\Exception $exception) {
            DB::rollBack();
        }
        return response()->json(['status' => 'ok']);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param array $vocabularyDay1
     */
    public function forward(Request $request)
    {
        $vocabularys['day'] = $request->all()[0]['day'];
        foreach ($request->all() as $vocabulary) {
            $vocabularys['idVocabulary'][] = $vocabulary['id'];
        }

        try {
            DB::beginTransaction();
            $this->vocabularyInterface->forwardJp($vocabularys);
            DB::commit();
        } catch (\Exception $exception) {
            DB::rollBack();
            return $exception->getMessage();
        }
        return response()->json(['status' => 'ok']);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param \App\Models\VocabularyDay $vocabularyDay1
     * @return \Illuminate\Http\Response
     */
    public function delete(Request $request)
    {
        foreach ($request->all() as $vocabulary) {
            $vocabularys['idVocabulary'][] = $vocabulary['id'];
        }

        try {
            DB::beginTransaction();
            $this->vocabularyInterface->deleteJp($vocabularys);
            DB::commit();
        } catch (\Exception $exception) {
            DB::rollBack();
        }
        return response()->json(['status' => 'ok']);
    }

    public function show($id)
    {
        return JpVocabulary::where('id', $id)->first();
    }
}
