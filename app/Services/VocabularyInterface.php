<?php

namespace App\Services;

interface VocabularyInterface{
    public function index();
    public function create(array $params);
    public function forward(array $params);
    public function delete(array $params);
    // todo
    // public function mergeSound($id);
}
