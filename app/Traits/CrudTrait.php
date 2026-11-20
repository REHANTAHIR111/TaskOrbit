<?php

namespace App\Traits;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use File;
use Illuminate\Support\Facades\Session;
use App\Services\UserHistoryService;
use Hash;
use DB;
use Str;
use App\Jobs\SetupShortcutData;
trait CrudTrait
{
    protected $userHistoryService;

    // Inject the UserHistoryService
    public function __construct(UserHistoryService $userHistoryService)
    {
        $this->userHistoryService = $userHistoryService;
    }

    abstract function model();
    abstract function models();
    abstract function validationRules($resource_id = 0);

    public function index(Request $request)
    {   
        $loginCompany = $request->company_id;
        $pageSize = (int)$request->pageSize;
        $sortColumn = $request->sortColumn;
        $direction = $request->direction;
        $search = $request->search;
         //for ambigous column error
        $modelClass = $this->model()['model'];
        $table = (new $modelClass())->getTable();
        $selectArray = array_map(function($value) use($table) {
            return $table.'.'.$value;
        },$this->model()['select']);
        if($this->relations()) {
        $data = $this->model()['model']::with(explode('|', implode('|', $this->relations())))
              //for default trigger and shortcut
           ->when($this->companyCheck && $loginCompany,function($query) use($loginCompany,$table){
                $query->where(function ($q) use ($loginCompany,$table) {
                    $q->where($table.'.company_id', $loginCompany);
                    if(in_array($this->viewVariable, ['trigger', 'shortcut'])) {
                        $q->orWhere($table.'.default', 1);
                    }
            });

        })
        ->when($search != '',function($query) use($search){
                return $query->where(function($q) use($search){
                    $result = $q->where($this->model()['search'][0],'LIKE',"%{$search}%");
                    foreach($this->model()['search'] as $searchColumn){
                        //search in relation
                        if(strpos($searchColumn,':')){
                            $relationArr = explode(':',$searchColumn);
                            $result = $result->orWhereHas($relationArr[0], function($query) use($relationArr,$search){
                                $searchRelation = explode(',',$relationArr[1]); 
                                $relationResult = $query->where($searchRelation[0],'LIKE',"%{$search}%");
                                foreach($searchRelation  as $column){
                                    if($relationArr[0] == 'creator'){
                                        $relationResult = $relationResult->orWhere(DB::raw('concat(first_name," ", last_name)'), 'LIKE', "%{$search}%");
                                    }else{
                                        $relationResult = $relationResult->orWhere($column,'LIKE',"%{$search}%");
                                    }
                                }

                            });
                        }else{
                            $result = $result->orWhere($searchColumn,'LIKE',"%{$search}%");
                        }
                    }
                    return $result;
            });
        })
        ->limit($this->model()['limit'])
         // for realtional sorting
       ->when(strpos($sortColumn, ':') !== false, function($query) use($sortColumn, $direction) {
            [$relationPath, $column] = explode(':', $sortColumn, 2);
            $sortColumn = explode(',', $column)[0]; // Use first column for sorting
            
            $relations = explode('.', $relationPath);
            $model = $query->getModel();
            $aliasPath = '';
            $previousTable = $model->getTable();
            
            foreach ($relations as $index => $relationName) {
                $relationMethod = Str::camel($relationName);
                
                // Verify relationship exists
                if (!method_exists($model, $relationMethod)) {
                    throw new \Exception("Relationship {$relationMethod} does not exist on " . get_class($model));
                }
                
                $relation = $model->{$relationMethod}();
                $related = $relation->getRelated();
                $relatedTable = $related->getTable();
                $alias = implode('_', array_slice($relations, 0, $index + 1)) . '_sort';
                $aliasPath = $alias;
                
                // For BelongsTo relationships
                if ($relation instanceof \Illuminate\Database\Eloquent\Relations\BelongsTo) {
                    $foreignKey = $relation->getForeignKeyName();
                    $ownerKey = $relation->getOwnerKeyName();
                    
                    $query->leftJoin(
                        "{$relatedTable} as {$alias}", 
                        "{$previousTable}.{$foreignKey}", 
                        '=', 
                        "{$alias}.{$ownerKey}"
                    );
                }
                // For HasOne relationships
                elseif ($relation instanceof \Illuminate\Database\Eloquent\Relations\HasOne) {
                    $foreignKey = $relation->getForeignKeyName();
                    $localKey = $relation->getLocalKeyName();
                    
                    $query->leftJoin(
                        "{$relatedTable} as {$alias}", 
                        "{$alias}.{$foreignKey}", 
                        '=', 
                        "{$previousTable}.{$localKey}"
                    );
                }
                // Add other relationship types as needed
                
                // Prepare for next iteration
                $model = $related;
                $previousTable = $alias;
            }
            
            $query->orderBy("{$aliasPath}.{$sortColumn}", $direction);
        }, function($query) use($sortColumn, $direction) {
            $query->orderBy($sortColumn, $direction);
        })
        ->select($selectArray)->paginate($pageSize);
        }   else {
            $data = $this->model()['model']::when($this->companyCheck,function($query) use($loginCompany){
                $query->where(function ($q) use ($loginCompany) {
                $q->where('company_id', $loginCompany);

                if (in_array($this->viewVariable, ['trigger', 'shortcut'])) {
                    $q->orWhere('company_id', 0);
                }
            });
            })->when($search != '',function($query) use($search){
                return $query->where(function($q) use($search){
                    $result = $q->where($this->model()['search'][0],'LIKE',"%{$search}%");
                    foreach($this->model()['search'] as $searchColumn){
                        $result = $result->orWhere($searchColumn,'LIKE',"%{$search}%");
                    }
                    return $result;
            });
        })->limit($this->model()['limit'])
        ->orderBy($sortColumn, $direction)
        ->select($selectArray)->paginate($pageSize);
        }
        // if(strpos($sortColumn,':')){
        //     $sortColumn = implode('.',explode(":",$sortColumn));
        // }
         //this is done for relational sorting inseat of orderby
        //  $sorted = $data->getCollection()->sortBy(function($d) use($sortColumn){
        //     return strtolower(data_get($d,$sortColumn));
        //    }, SORT_REGULAR, $direction == 'desc');

         // Replace original collection with sorted one
        //  $data->setCollection($sorted->values());

        $response = [
            'data' => $data->items(),
            'total' => $data->total(),
            'perPage' => $data->perPage(),
            'currentPage' => $data->currentPage(),
            'lastPage' => $data->lastPage(),
            'success' => true
        ];
        $responsejson=json_encode($response);
        $data=gzencode($responsejson,9);
        return response($data)->withHeaders([
            'Content-type' => 'application/json; charset=utf-8',
            'Content-Length'=> strlen($data),
            'Content-Encoding' => 'gzip'
        ]);
        // return response()->json(['data' => $data]);
    }

    public function create(Request $request)
    {   
        $variables = [];
        $valdata = [];
        $data = [];
        $models = $request ? $this->models($request) : $this->models();
        if($this->models()) {
            foreach ($models as $key => $value) {
                $variables[] = $key;
                $valdata[] = $value;
            }
            foreach ($variables as $key => $maindata) {
                $data[$maindata] = $valdata[$key];
            }
        }
        $response = [
            'data' => $data
        ];
        $responsejson=json_encode($response);
        $data=gzencode($responsejson,9);
        return response($data)->withHeaders([
            'Content-type' => 'application/json; charset=utf-8',
            'Content-Length'=> strlen($data),
            'Content-Encoding' => 'gzip'
        ]);
        // return response()->json(['data' => $data]);
    }

    public function store(Request $request)
    {
        $request->validate($this->validationRules(null,$request));
        // Validator::make($request->all(), $this->validationRules($request))->validate();
        $data = $request->all();
        // print_r($data);die();
        //print_r($data);die();
        foreach ($this->files() as $key => $value) {
            $fileName = null;
            if($value == 1)
                $data[$key] = [];
            if (request()->hasFile($key))  {
                if($value == 1){
                    foreach(request()->File($key) as $k => $image) {
                        $file = $image;
                        $fileName = md5($file->getClientOriginalName()) . time().$k . "." . $file->getClientOriginalExtension();
                        $file->move(public_path('/media/images'), $fileName);
                        $data[$key][] = $fileName;
                    }
                }
                else{
                    $file = request()->File($key);
                    $fileName = md5($file->getClientOriginalName()) . time() . "." . $file->getClientOriginalExtension();
                    $file->move(public_path('/assets/new-media'), $fileName);
                    $data[$key] = $fileName;
                }
                
            }
            else {
                $data[$key] = null;
            }
        }
        $relations = [];
        foreach ($this->relations() as $key => $value) {
            $value = explode(':', $value)[0];
            if (isset($data[$key]) && is_array($data[$key])) {
                $relations[$value] = $data[$key];
                unset($data[$key]);
            }   
        }
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                if(isset($this->arrayData()[$key])){
                    $data[$key] = $this->arrayData()[$key] == 0 ? implode(',',$value) : json_encode($value); 
                }
            }
        }
        foreach($data as $key => $value){
            if($key == 'password'){
                $data[$key] = Hash::make($value);
            }
            if($key == 'company_id' && $value == '' && $request->role_code && $request->role_code =='superadmin' &&  in_array($this->viewVariable, ['shortcut'])){
                $data[$key] = 0;
            }
        }
        unset($data['role_code']);
        $item = $this->model()['model']::create($data);

        $userId = auth()->user()->id;
        $moduleId = 123;
        $message = "$this->viewVariable has been created";
        $this->userHistoryService->StoreUserHistory($userId, $moduleId, $message);

        foreach ($relations as $key => $value) {
            if(method_exists($item->$key(), 'attach')){
                $item->$key()->attach($value);
            }   else{
                $array = [];
                foreach ($value as $v) {
                    if (is_array($v))
                        $array = $v;
                    else
                        $array = [array_search($key,$this->relations()) => $v];
                    $item->$key()->create($array);
                }
            }
            
        }
        $response = ['success' => true, 'item' => $item, 'message' => $this->viewVariable. ' Has been created!'];
        $responsejson=json_encode($response);
        $data=gzencode($responsejson,9);
        return response($data)->withHeaders([
            'Content-type' => 'application/json; charset=utf-8',
            'Content-Length'=> strlen($data),
            'Content-Encoding' => 'gzip'
        ]);
    }

    public function edit($resource_id,Request $request)
    {
        $models = $request ? $this->models($request) : $this->models();
        if($this->relations()) {
        $editdata = $this->model()['model']::with(explode('|', implode('|', $this->relations())))->select($this->model()['select'])->findOrFail($resource_id);
        }   else {
            $editdata = $this->model()['model']::select($this->model()['select'])->findOrFail($resource_id);
        }
        $variables = [];
        $valdata = [];
        $data = [];
        if($models) {
            foreach ($models as $key => $value) {
                $variables[] = $key;
                $valdata[] = $value;
            }
            foreach ($variables as $key => $maindata) {
                $data[$maindata] = $valdata[$key];
            }
        }
        $response = [
            'editdata' => $editdata,
            'data' => $data
        ];
        $responsejson=json_encode($response);
        $data=gzencode($responsejson,9);
        return response($data)->withHeaders([
            'Content-type' => 'application/json; charset=utf-8',
            'Content-Length'=> strlen($data),
            'Content-Encoding' => 'gzip'
        ]);
        // return response()->json(['editdata' => $editdata, 'data' => $data]);
    }

    public function update(Request $request, $resource_id)
    {
        $resource = $this->model()['model']::findOrFail($resource_id);
        $request->validate($this->validationRules($resource_id,$request));
        // Validator::make($request->all(), $this->validationRules($request,$resource_id))->validate();
        $data = $request->all();
        unset($data['_token']);
        unset($data['_method']);

        foreach ($this->files() as $key => $value) {
            $fileName = null;
            if($value == 1)
                $data[$key] = [];

            if (request()->hasFile($key))  {
                if($value == 1){
                    foreach(request()->File($key) as $k => $image) {
                        $file = $image;
                        $fileName = md5($file->getClientOriginalName()) . time().$k . "." . $file->getClientOriginalExtension();
                        $file->move(public_path('/media/images'), $fileName);
                        $data[$key][] = $fileName;
                    }
                }
                else{
                    $file = request()->File($key);
                    $fileName = md5($file->getClientOriginalName()) . time() . 'e'. "." . $file->getClientOriginalExtension();
                    $file->move(public_path('/assets'), $fileName);
                    $data[$key] = $fileName;
                }
                
            }
            else {
                unset($data[$key]);
            }
        }
        $relations = [];
        foreach ($this->relations() as $key => $value) {
    $value = explode(':', $value)[0];
            if (isset($data[$key]) && is_array($data[$key])) {
                $relations[$value] = $data[$key];
                unset($data[$key]);
            }
            
        }
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                if(isset($this->arrayData()[$key])){
                    $data[$key] = $this->arrayData()[$key] == 0 ? implode(',',$value) : json_encode($value); 
                }
            }
        }
        $this->model()['model']::where('id', $resource_id)->update($data);
        if($this->relations()) {
            $item = $this->model()['model']::with(explode('|', implode('|', $this->relations())))->findOrFail($resource_id);
        }
        else{
            $item = $this->model()['model']::findOrFail($resource_id);
        }
        foreach ($relations as $key => $value) {
            if(method_exists($item->$key(), 'attach')){
                $item->$key()->detach();
                $item->$key()->attach($value);
            }else{
                $item->$key()->delete();
                $array = [];
                foreach ($value as $v) {
                    if (is_array($v))
                        $array = $v;
                    else
                        $array = [array_search($key,$this->relations()) => $v];
                        $item->$key()->create($array);
                }
            }
            
        }

        foreach($data as $key => $value){
            if($key == 'password'){
                $data[$key] = Hash::make($value);
            }
        }
        $resource->update($data);

        $userId = auth()->user()->id;
        $moduleId = 123;
        $message = "$this->viewVariable has been Updated";
        $this->userHistoryService->StoreUserHistory($userId, $moduleId, $message);

        $response = ['success' => true, 'message' => $this->viewVariable. ' Has been updated!'];
        $responsejson=json_encode($response);
        $data=gzencode($responsejson,9);
        return response($data)->withHeaders([
            'Content-type' => 'application/json; charset=utf-8',
            'Content-Length'=> strlen($data),
            'Content-Encoding' => 'gzip'
        ]);
    }

    public function destroy($resource_id)
    {
        if($this->relations()) {
            $resource = $this->model()['model']::with(explode('|', implode('|', $this->relations())))->findOrFail($resource_id);
        }
        else 
        {
            $resource = $this->model()['model']::findOrFail($resource_id);
        }
        if($this->relations()) {
            foreach ($this->relations() as $key => $value) {
                if(strpos($value, '.') === false){
                    $value = explode(':', $value)[0];
                    if(method_exists($resource->$value(), 'attach')){
                        $resource->$value()->detach();
                    }elseif(method_exists($resource->$value(), 'makeMany')){
                        $resource->$value()->delete();
                    }
                }
            }
        }
        if(!empty($this->model()['image_folder'])){
            $imagePath = public_path('assets/images/'.$this->model()['image_folder'].'/'.$resource->image);
            if(!empty($resource->image) && file_exists($imagePath)){
                unlink($imagePath);
            }
        }
        $resource->delete();

        $userId = auth()->user()->id;
        $moduleId = 123;
        $message = "$this->viewVariable has been Deleted";
        $this->userHistoryService->StoreUserHistory($userId, $moduleId, $message);

        $response = ['success' => true, 'message' => $this->viewVariable. ' Has been deleted!'];
        $responsejson=json_encode($response);
        $data=gzencode($responsejson,9);
        return response($data)->withHeaders([
            'Content-type' => 'application/json; charset=utf-8',
            'Content-Length'=> strlen($data),
            'Content-Encoding' => 'gzip'
        ]);
    }
    
    public function multidelete(Request $request)
    {
        $success = false;
        if(isset($request->id) || isset($request->type)) {
            $ids = $request->id;
            $type = $request->type;
            
            if($this->relations()) {
                $deletemultiple = $this->model()['model']::with(explode('|', implode('|', $this->relations())))->whereIn('id',$ids)->get();
            } else {
                $deletemultiple = $this->model()['model']::whereIn('id',$ids)->get();
            }
            
            if($this->relations()) {
                foreach($deletemultiple as $k => $resource){
                    foreach ($this->relations() as $key => $value) {
                        if(strpos($value, '.') === false){
                            $value = explode(':', $value)[0];
                            if(method_exists($resource->$value(), 'attach')){
                                $resource->$value()->detach();
                            }elseif(method_exists($resource->$value(), 'makeMany')){
                                $resource->$value()->delete();
                            }
                        }
                    }
                }
            }
            if(!empty($this->model()['image_folder'])){
                foreach($deletemultiple as $k => $resource){
                    $imagePath = public_path('assets/images/'.$this->model()['image_folder'].'/'.$resource->image);
                    if(!empty($resource->image) && file_exists($imagePath)){
                        unlink($imagePath);
                    }
                }
            }
            $deletemultiple->each->delete();
            $success = true;
            
            // multi work
            // if($type == 1) {
            //     // Enable Status Work
            //     $multiple = $this->model()['model']::whereIn('id',$ids)->get();
            //     foreach($multiple as $ke => $resource){
            //         $resource->status = 1;
            //         $resource->update();
            //     }
            //     $success = true;
            // }
            // elseif($type == 2) {
            //     // Disable Status Work
            //     $multiple = $this->model()['model']::whereIn('id',$ids)->get();
            //     foreach($multiple as $kd => $resource){
            //         $resource->status = 0;
            //         $resource->update();
            //     }
            //     $success = true;
            // }
            // elseif($type == 3) {
            //     // Delete Work
            //     if($this->relations()) {
            //         $deletemultiple = $this->model()['model']::with(explode('|', implode('|', $this->relations())))->whereIn('id',$ids)->get();
            //     } else {
            //         $deletemultiple = $this->model()['model']::whereIn('id',$ids)->get();
            //     }
                
            //     if($this->relations()) {
            //         foreach($deletemultiple as $k => $resource){
            //             // print_r($resource);die();
            //             foreach ($this->relations() as $key => $value) {
            //                 $value = explode(':', $value)[0];
            //                 if(method_exists($resource->$value(), 'attach')){
            //                     $resource->$value()->detach();
            //                 }elseif(method_exists($resource->$value(), 'makeMany')){
            //                     $resource->$value()->delete();
            //                 }
            //             }
            //         }
            //     }
            //     $deletemultiple->each->delete();
            //     $success = true;
            // }
        }
        $userId = auth()->user()->id;
        $moduleId = 123;
        $message = "$this->viewVariable has been multiDeleted";
        $this->userHistoryService->StoreUserHistory($userId, $moduleId, $message);

        $response = ['success' => $success, 'message' => $this->viewVariable. ' Has been deleted!'];
        $responsejson=json_encode($response);
        $data=gzencode($responsejson,9);
        return response($data)->withHeaders([
            'Content-type' => 'application/json; charset=utf-8',
            'Content-Length'=> strlen($data),
            'Content-Encoding' => 'gzip'
        ]);
    }
}