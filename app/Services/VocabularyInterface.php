<?php

namespace App\Services;

interface VocabularyInterface{
    public function index();
    public function create(array $params);
    public function forward(array $params);
    public function delete(array $params);
    public function createJp(array $params);
    public function deleteJp(array $params);
    public function forwardJp(array $params);
    // todo
    // public function mergeSound($id);
}
