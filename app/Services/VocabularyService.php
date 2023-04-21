<?php

namespace App\Services;

use App\Models\JpVocabulary;
use App\Models\VocabularyDay;
use Illuminate\Support\Facades\DB;
use Goutte\Client;
use Str;

class VocabularyService implements VocabularyInterface
{
    public function index()
    {
    }

    public function create(array $params)
    {
        $arrayEnglish = explode(' ', $params['english']);
        $spellUS = $spellUK = '';
        foreach ($arrayEnglish as $english) {
            $client = new Client();
            $crawler = $client->request(
                'GET',
                'https://dictionary.cambridge.org/dictionary/english/' . $english
            );
            $spellUS = $spellUS . ' /' . $crawler->filter('.us.dpron-i span.ipa')->first()->text() . '/' ?? null;
            $spellUK = $spellUK . ' /' . $crawler->filter('.uk.dpron-i span.ipa')->first()->text() . '/' ?? null;
        }
        $spell = [
            'us' => trim($spellUS),
            'uk' => trim($spellUK),
        ];
        try {
            DB::beginTransaction();
            $vocabularyDay = VocabularyDay::firstOrCreate(
                ['english' => Str::lower($params['english'])],
                [
                    'spell' => $spell,
                    'vietnamese' => Str::lower($params['vietnamese']),
                    'example' => $params['example'],
                    'day' => 1,
                    'status' => 0,
                ]
            );
            DB::commit();
        } catch (\Exception $exception) {
            DB::rollBack();
            return $exception->getMessage();
        }

        return [$vocabularyDay, $params];
    }

    public function forward(array $params)
    {
        $day = $params['day'];
        $idVocabulary = $params['idVocabulary'];

        if($day == 1){
            foreach ($idVocabulary as $id) {
                VocabularyDay::find($id)->update([
                    'day' => $day + 1,
                    'status' => 1,
                ]);
            }
            return;
        }

        if($day == 5){
            return;
        }

        foreach ($idVocabulary as $id) {
            VocabularyDay::find($id)->update([
                'day' => $day + 1,
                'status' => rand(0,1),
            ]);
        }
    }

    public function delete(array $params)
    {
        VocabularyDay::whereIn('id', $params['idVocabulary'])->delete();
    }

    /* todo
    public function mergeSound($id)
    {
        $models = [
            '1' => VocabularyDay::query()->where('day', 1),
            '2' => VocabularyDay::query()->where('day', 2),
            '3' => VocabularyDay::query()->where('day', 3),
            '4' => VocabularyDay::query()->where('day', 4),
            '5' => VocabularyDay::query()->where('day', 5),
        ];
        fopen(__DIR__ . '/../../storage/app/MergeSound.mp3', "w+");
        $client = new Client();
        $words = $models[$id]->get()->toArray();
        foreach ($words as $word) {
            if (!substr_count($word['english'], ' ')) {
                $crawler = $client->request(
                    'GET',
                    'https://dictionary.cambridge.org/dictionary/english/' . $word['english']
                );
                $url = 'https://dictionary.cambridge.org' . $crawler->filter('.us.dpron-i source')->first()->attr('src');
                file_put_contents(
                    __DIR__ . '/../../storage/app/MergeSound.mp3',
                    file_get_contents(__DIR__ . '/../../storage/app/MergeSound.mp3') .
                    file_get_contents($url)
                );
            }
        }
    }
    */

    public function createJp(array $params)
    {
        try {
            DB::beginTransaction();
            $vocabularyDay = JpVocabulary::firstOrCreate(
                ['japanese' => Str::lower($params['japanese'])],
                [
                    'spell' => $params['spell'],
                    'vietnamese' => Str::lower($params['vietnamese']),
                    'example' => $params['example'],
                    'day' => 1,
                    'status' => 0,
                ]
            );
            DB::commit();
        } catch (\Exception $exception) {
            DB::rollBack();
            return $exception->getMessage();
        }

        return [$vocabularyDay, $params];
    }

    public function deleteJp(array $params)
    {
        JpVocabulary::whereIn('id', $params['idVocabulary'])->delete();
    }

    public function forwardJp(array $params)
    {
        $day = $params['day'];
        $idVocabulary = $params['idVocabulary'];

        if($day == 1){
            foreach ($idVocabulary as $id) {
                JpVocabulary::find($id)->update([
                    'day' => $day + 1,
                    'status' => 1,
                ]);
            }
            return;
        }

        if($day == 5){
            return;
        }

        foreach ($idVocabulary as $id) {
            JpVocabulary::find($id)->update([
                'day' => $day + 1,
                'status' => rand(0,1),
            ]);
        }
    }
}
