<?php

namespace App\Services;

use App\Models\VocabularyDay1;
use App\Models\VocabularyDay2;
use App\Models\VocabularyDay3;
use App\Models\VocabularyDay4;
use App\Models\VocabularyDay5;
use Illuminate\Support\Facades\DB;
use Goutte\Client;

class VocabularyService implements VocabularyInterface
{
    public function index()
    {
    }

    public function create(array $params)
    {
        $client = new Client();
        $crawler = $client->request(
            'GET',
            'https://dictionary.cambridge.org/dictionary/english/' . $params['english']
        );
        $spell = [];
        if ($crawler->filter('.uk.dpron-i span.ipa')->first()->getNode(0)) {
            $spellUK = $crawler->filter('.uk.dpron-i span.ipa')->first()->text() ?? null;
            $spellUS = $crawler->filter('.us.dpron-i span.ipa')->first()->text() ?? null;
            $spell = [
                'us' => '/' . $spellUS . '/',
                'uk' => '/' . $spellUK . '/',
            ];
        }
        try {
            DB::beginTransaction();
            VocabularyDay1::firstOrCreate(
                ['english' => $params['english']],
                [
                    'vietnamese' => $params['vietnamese'],
                    'spell' => $spell,
                ]
            );
            DB::commit();
        } catch (\Exception $exception) {
            DB::rollBack();
            return $exception->getMessage();
        }
    }

    public function forward(array $params)
    {
        $models = [
            '1' => VocabularyDay1::query(),
            '2' => VocabularyDay2::query(),
            '3' => VocabularyDay3::query(),
            '4' => VocabularyDay4::query(),
            '5' => VocabularyDay5::query(),
        ];
        $day = $params['day'];
        $idVocabulary = $params['idVocabulary'];

        foreach ($models[$day]->whereIn('id', $idVocabulary)->get(['english', 'spell', 'vietnamese'])->toArray() as $vocabulary) {
            $models[$day + 1]->create($vocabulary);
        }
        // $models[$day + 1]->insert(
        //     $models[$day]->whereIn('id', $idVocabulary)->get(['english', 'spell', 'vietnamese'])->toArray()
        // );
    }

    public function delete(array $params)
    {
        $models = [
            '1' => VocabularyDay1::query(),
            '2' => VocabularyDay2::query(),
            '3' => VocabularyDay3::query(),
            '4' => VocabularyDay4::query(),
            '5' => VocabularyDay5::query(),
        ];
        $day = $params['day'];
        $idVocabulary = $params['idVocabulary'];

        $models[$day]->whereIn('id', $idVocabulary)->delete();
    }

    public function mergeSound(array $params)
    {
        $models = [
            '1' => VocabularyDay1::query(),
            '2' => VocabularyDay2::query(),
            '3' => VocabularyDay3::query(),
            '4' => VocabularyDay4::query(),
            '5' => VocabularyDay5::query(),
        ];
        fopen("C:\Users\ducnc\Desktop\New folder\MergeSound.mp3", "w");
        $client = new Client();
        $words = $models[$params['day']]->get()->toArray();
        foreach ($words as $word) {
            $crawler = $client->request(
                'GET',
                'https://dictionary.cambridge.org/dictionary/english/' . $word['english']
            );
            $url = 'https://dictionary.cambridge.org' . $crawler->filter('.us.dpron-i source')->first()->attr('src');
            file_put_contents(
                'C:\Users\ducnc\Desktop\New folder\MergeSound.mp3',
                file_get_contents('C:\Users\ducnc\Desktop\New folder\MergeSound.mp3') .
                    file_get_contents($url)
            );
        }
    }
}
