<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\VocaburalyForwardRequest;
use App\Http\Requests\VocaburalyRequest;
use App\Models\VocabularyDay;
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
        $days = [1, 2, 3, 4, 5];
        $vocabularyDays = [
            '1' => json_encode(VocabularyDay::where('day', 1)->get()->shuffle()), '2' => json_encode(VocabularyDay::where('day', 2)->get()->shuffle()),
            '3' => json_encode(VocabularyDay::where('day', 3)->get()->shuffle()), '4' => json_encode(VocabularyDay::where('day', 4)->get()->shuffle()),
            '5' => json_encode(VocabularyDay::where('day', 5)->get()->shuffle())
        ];
        // $vocabularyDay1 = VocabularyDay::where('day', 1)->get()->shuffle();
        return response()->json($vocabularyDays);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param \App\Http\Requests\VocaburalyRequest $request
     * @return \Illuminate\Routing\Redirector
     */
    public function store(Request $request)
    {
        $this->vocabularyInterface->create($request->all());
        return redirect(route('english.vocabulary.index'));
    }

    /**
     * Display the specified resource.
     *
     * @param \App\Models\VocabularyDay $vocabularyDay1
     * @return \Illuminate\Http\Response
     */
    public function show(VocabularyDay $vocabularyDay1)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param \App\Models\VocabularyDay $vocabularyDay1
     * @return \Illuminate\Http\Response
     */
    public function edit(VocabularyDay $vocabularyDay1)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param \Illuminate\Http\Request $request
     * @param \App\Models\VocabularyDay $vocabularyDay1
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, VocabularyDay $vocabularyDay1)
    {
        //
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
            $this->vocabularyInterface->delete($params);
            DB::commit();
        } catch (\Exception $exception) {
            DB::rollBack();
        }
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param array $vocabularyDay1
     */
    public function forward(Request $request)
    {
        $vocabularys['day'] = $request->all()[0]['day'];
        foreach($request->all() as $vocabulary){
            $vocabularys['idVocabulary'][] = $vocabulary['id'];
        }
        
        try {
            DB::beginTransaction();
            $this->vocabularyInterface->forward($vocabularys);
            DB::commit();
        } catch (\Exception $exception) {
            DB::rollBack();
            return $exception->getMessage();
        }
        return json_encode($request->all());
    }
}
