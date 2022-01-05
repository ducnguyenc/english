<?php

namespace App\Http\Controllers;

use App\Models\Flirt;
use App\Models\FlirtCategory;
use App\Models\FlirtType;
use Illuminate\Http\Request;

class FlirtController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $params = $request->all();
        $query = Flirt::query();
        if (isset($params['type'])) {
            $types = explode(',', $params['type']);
            foreach ($types as $type) {
                $query->orWhereJsonContains('flirt_type_id', (int)$type);
            }
        }
        if (isset($params['category'])) {
            $categories = explode(',', $params['category']);
            foreach ($categories as $category) {
                $query->orWhereJsonContains('flirt_category_id', (int)$category);
            }
        }
        if (isset($params['content'])) {
            $query->orWhere('content', 'like', '%' . $params['content'] . '%');
        }
        return $query->get();
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        $params = $request->all();
        Flirt::create([
            'flirt_type_id' => $params['type'],
            'flirt_category_id' => $params['category'],
            'content' => $params['content'],
            'link' => $params['link'],
        ]);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        Flirt::where('id', $id)->delete();
    }

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function typeIndex()
    {
        return FlirtType::all();
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function typeStore(Request $request)
    {
        FlirtType::query()->create($request->all());
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroyType($id)
    {
        FlirtType::where('id', $id)->delete();
    }

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function categoryIndex()
    {
        return FlirtCategory::all();
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function categoryStore(Request $request)
    {
        FlirtCategory::query()->create($request->all());
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroyCategory($id)
    {
        FlirtCategory::where('id', $id)->delete();
    }
}
