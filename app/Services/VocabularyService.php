<?php

namespace App\Services;

use App\Models\JpVocabulary;
use App\Models\VocabularyDay;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Symfony\Component\DomCrawler\Crawler;

class VocabularyService implements VocabularyInterface
{
    public function index()
    {
    }

    public function create(array $params)
    {
        $arrayEnglish = explode(' ', $params['english']);
        $spellUS = $spellUK = $partOfSpeech = '';
        foreach ($arrayEnglish as $english) {
            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            ])->get('https://dictionary.cambridge.org/dictionary/english/' . $english);
            $htmlString = (string)$response->getBody();
            $crawler = new Crawler($htmlString);
            $spellUS = $spellUS . ' /' . $crawler->filter('.uk.dpron-i span.pron span.ipa')->text() . '/' ?? null;
            $spellUK = $spellUK . ' /' . $crawler->filter('.us.dpron-i span.pron span.ipa')->text() . '/' ?? null;
            $partOfSpeech = $partOfSpeech . $crawler->filter('.pos.dpos')->text() ?? null;
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
                    'part_of_speech' => $partOfSpeech,
                    'spell' => $spell,
                    'vietnamese' => Str::lower($params['vietnamese']),
                    'example' => $params['example'],
                    'day' => 1,
                    'status' => 0,
                    'image' => $params['image'],
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

        if ($day == 1) {
            foreach ($idVocabulary as $id) {
                VocabularyDay::find($id)->update([
                    'day' => $day + 1,
                    'status' => 1,
                ]);
            }
            return;
        }

        if ($day == 5) {
            return;
        }

        foreach ($idVocabulary as $id) {
            VocabularyDay::find($id)->update([
                'day' => $day + 1,
                'status' => rand(0, 1),
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

        if ($day == 1) {
            foreach ($idVocabulary as $id) {
                JpVocabulary::find($id)->update([
                    'day' => $day + 1,
                    'status' => 1,
                ]);
            }
            return;
        }

        if ($day == 5) {
            return;
        }

        foreach ($idVocabulary as $id) {
            JpVocabulary::find($id)->update([
                'day' => $day + 1,
                'status' => rand(0, 1),
            ]);
        }
    }
}
