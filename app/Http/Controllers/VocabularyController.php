<?php

namespace App\Http\Controllers;

use App\Http\Requests\VocaburalyRequest;
use App\Models\VocabularyDay1;
use App\Models\VocabularyDay2;
use App\Models\VocabularyDay3;
use App\Models\VocabularyDay4;
use App\Models\VocabularyDay5;
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
     * @return \Illuminate\Contracts\View\View
     */
    public function index()
    {
        $days = [1, 2, 3, 4, 5];
        $vocabularyDays = [
            '1' => VocabularyDay1::all()->shuffle(), '2' => VocabularyDay2::all()->shuffle(),
            '3' => VocabularyDay3::all()->shuffle(), '4' => VocabularyDay4::all()->shuffle(),
            '5' => VocabularyDay5::all()->shuffle()
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
    public function store(VocaburalyRequest $request)
    {
        $this->vocabularyInterface->create($request->all());
        return redirect(route('english.vocabulary.index'));
    }

    /**
     * Display the specified resource.
     *
     * @param \App\Models\VocabularyDay1 $vocabularyDay1
     * @return \Illuminate\Http\Response
     */
    public function show(VocabularyDay1 $vocabularyDay1)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param \App\Models\VocabularyDay1 $vocabularyDay1
     * @return \Illuminate\Http\Response
     */
    public function edit(VocabularyDay1 $vocabularyDay1)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param \Illuminate\Http\Request $request
     * @param \App\Models\VocabularyDay1 $vocabularyDay1
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, VocabularyDay1 $vocabularyDay1)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param \App\Models\VocabularyDay1 $vocabularyDay1
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
        try {
            DB::beginTransaction();
            $this->vocabularyInterface->forward($request->all());
            $this->vocabularyInterface->delete($request->all());
            DB::commit();
        } catch (\Exception $exception) {
            DB::rollBack();
            return $exception->getMessage();
        }
        return redirect(route('english.vocabulary.index'));
    }

    public function mergeSound($id)
    {
        if ($id <= 5) {
            $this->vocabularyInterface->mergeSound($id);
            return response()->download(realpath(__DIR__ . '/../../../storage/app/MergeSound.mp3'));
        }
    }
}
