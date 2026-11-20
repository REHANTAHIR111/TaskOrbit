<?php

namespace App\Helper;

use Illuminate\Support\Facades\File;

class ImageUploadHelper
{
    public static function UploadImage($file,$path,$fileName = null,$company_id = null){
        $fullPath = public_path('assets/images/' . $path);
        if (!File::exists($fullPath)) {
            File::makeDirectory($fullPath, 0755, true, true);
        }
        if(empty($company_id)){
            $company_id = auth()->user()->company_id;
        }
        if(empty($fileName)){
            $fileName = $company_id . '_company' . '_' . time() . '_' . $file->getClientOriginalName();
        }
        $file->move($fullPath, $fileName);
        return $fileName;
    }
    public static function UploadMultiImage($files,$path){
        $upload = '';
        $fullPath = public_path('assets/images/' . $path);
        if (!File::exists($fullPath)) {
            File::makeDirectory($fullPath, 0755, true, true);
        }
        $loginCompany = auth()->user()->company_id;
        $filesNames = [];
        foreach($files as $file){
            $fileName = $loginCompany . '_company' . '_' . time() . '_' . $file->getClientOriginalName();
            $file->move($fullPath, $fileName);
            $filesNames[] = $fileName; 
        }
        return $filesNames;
    }
}