<?php

namespace App\Http\Controllers;

use App\Http\Requests\VocaburalyForwardRequest;
use App\Http\Requests\VocaburalyRequest;
use App\Models\VocabularyDay;
use App\Models\VocabularyDay2;
use App\Models\VocabularyDay3;
use App\Models\VocabularyDay4;
use App\Models\VocabularyDay5;
use App\Services\VocabularyInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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
     * @return \Illuminate\Contracts\View\View
     */
    public function index()
    {
//        dd(\request()->all());
        $days = [1, 2, 3, 4, 5];
        $vocabularyDays = [
            '1' => VocabularyDay::where('day', 1)->get()->shuffle(), '2' => VocabularyDay::where('day', 2)->get()->shuffle(),
            '3' => VocabularyDay::where('day', 3)->get()->shuffle(), '4' => VocabularyDay::where('day', 4)->get()->shuffle(),
            '5' => VocabularyDay::where('day', 5)->get()->shuffle()
        ];
        return view('vocabulary.vocabulary', compact('days', 'vocabularyDays'));
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
//    public function store(VocaburalyRequest $request)
    public function store()
    {
        dd(\request()->all());
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
    public function forward(VocaburalyForwardRequest $request)
    {
        try {
            DB::beginTransaction();
            $this->vocabularyInterface->forward($request->all());
            DB::commit();
        } catch (\Exception $exception) {
            DB::rollBack();
            return $exception->getMessage();
        }
        return redirect(route('english.vocabulary.index'));
    }

    /* todo
    public function mergeSound($id)
    {
        if ($id <= 5) {
            $this->vocabularyInterface->mergeSound($id);
            return response()->download(realpath(__DIR__ . '/../../../storage/app/MergeSound.mp3'));
        }
    }
    */
}
