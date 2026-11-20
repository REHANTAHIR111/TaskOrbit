<?php

namespace App\Helper;
use Request;
use App\Helper\ConditionSetup_helper;

use App\Models\CustomerSegmentationCondition;

class ConditionSetup_helper
{
    static function CreateConditionsetup($data,$segmetation_id){
      foreach ($data['conditiondata'] as $keyy => $valuee) {
            $conditiondata = [
                  'condition_id' => $segmetation_id,
            ];
            
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '4'){
                  $conditiondata['condition_type'] = 4;
                  $conditiondata['first_order_completion_days'] = isset($valuee['first_order_date']) ? $valuee['first_order_date'] : 0;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '5'){
                  $conditiondata['condition_type'] = 5;
                  $conditiondata['last_order_completion_days'] = isset($valuee['last_order_date']) ? $valuee['last_order_date'] : 0;
            }
                
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '6'){
                  $conditiondata['condition_type'] = 6;
                  $conditiondata['payment_method_id'] = isset($valuee['paymentMethod']) ? implode(',', array_column($valuee['paymentMethod'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '7'){
                  $conditiondata['condition_type'] = 7;
                  $conditiondata['shipping_method_id'] = isset($valuee['shippingMethod']) ? implode(',', array_column($valuee['shippingMethod'], 'value')) : null;
            }
            
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '8'){
                  $conditiondata['condition_type'] = 8;
                  $conditiondata['coupon'] = isset($valuee['paymentMethod']) ? implode(',', array_column($valuee['coupon'], 'label')) : null;
            }

             if(isset($valuee['type']['value']) && $valuee['type']['value'] == '9'){
                  $conditiondata['condition_type'] = 9;
                  $conditiondata['order_qty'] = isset($valuee['order_qty']) ? $valuee['order_qty'] : 0;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '10'){
                  $conditiondata['condition_type'] = 10;
                  $conditiondata['total_amount'] = isset($valuee['total_amount']) ? $valuee['total_amount'] : 0;
            }
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '11'){
                  $conditiondata['condition_type'] = 11;
                  $conditiondata['average_order_total'] = isset($valuee['average_order_total']) ? $valuee['average_order_total'] : 0;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '12'){
                  $conditiondata['condition_type'] = 12;
                  $conditiondata['total_product_qty'] = isset($valuee['total_product_qty']) ? $valuee['total_product_qty'] : 0;
            }
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '14'){
                  $conditiondata['condition_type'] = 14;
                  $conditiondata['billing_area_id'] = isset($valuee['billing_area']) ? implode(',', array_column($valuee['billing_area'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '15'){
                  $conditiondata['condition_type'] = 15;
                  $conditiondata['billing_city_id'] = isset($valuee['billing_city']) ? implode(',', array_column($valuee['billing_city'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '16'){
                  $conditiondata['condition_type'] = 16;
                  $conditiondata['billing_state_id'] = isset($valuee['billing_state']) ? implode(',', array_column($valuee['billing_state'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '17'){
                  $conditiondata['condition_type'] = 17;
                  $conditiondata['billing_country_id'] = isset($valuee['billing_country']) ? implode(',', array_column($valuee['billing_country'], 'value')) : null;
            }
            
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '18'){
                  $conditiondata['condition_type'] = 18;
                  $conditiondata['billing_zip'] = isset($valuee['billing_zip']) ? $valuee['billing_zip'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '20'){
                  $conditiondata['condition_type'] = 20;
                  $conditiondata['shipping_area_id'] = isset($valuee['shipping_area']) ? implode(',', array_column($valuee['shipping_area'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '21'){
                  $conditiondata['condition_type'] = 21;
                  $conditiondata['shipping_city_id'] = isset($valuee['shipping_city']) ? implode(',', array_column($valuee['shipping_city'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '22'){
                  $conditiondata['condition_type'] = 22;
                  $conditiondata['shipping_state_id'] = isset($valuee['shipping_state']) ? implode(',', array_column($valuee['shipping_state'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '23'){
                  $conditiondata['condition_type'] = 23;
                  $conditiondata['shipping_country_id'] = isset($valuee['shipping_country']) ? implode(',', array_column($valuee['shipping_country'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '24'){
                  $conditiondata['condition_type'] = 24;
                  $conditiondata['shipping_zip'] = isset($valuee['shipping_zip']) ? $valuee['shipping_zip'] : null;
            }
            
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '26'){
                  $conditiondata['condition_type'] = 26;
                  $conditiondata['associate_website_id'] = $valuee['associate_website']['value'] ? $valuee['associate_website']['value'] : null ;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '27'){
                  $conditiondata['condition_type'] = 27;
                  $conditiondata['days_after_birth'] = isset($valuee['days_after_birth']) ? $valuee['days_after_birth'] : 0;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '28'){
                  $conditiondata['condition_type'] = 28;
                  $conditiondata['days_before_birth'] = isset($valuee['days_before_birth']) ? $valuee['days_before_birth'] : 0;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '29'){
                  $conditiondata['condition_type'] = 29;
                  $conditiondata['days_last_visit'] = isset($valuee['days_last_visit']) ? $valuee['days_last_visit'] : 0;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '30'){
                  $conditiondata['condition_type'] = 30;
                  $conditiondata['days_from_register'] = isset($valuee['days_from_register']) ? $valuee['days_from_register'] : 0;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '31'){
                  $conditiondata['condition_type'] = 31;
                  $conditiondata['first_name'] = isset($valuee['first_name']) ? $valuee['first_name'] : null;
            }  

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '32'){
                  $conditiondata['condition_type'] = 32;
                  $conditiondata['middle_name'] = isset($valuee['middle_name']) ? $valuee['middle_name'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '33'){
                  $conditiondata['condition_type'] = 33;
                  $conditiondata['last_name'] = isset($valuee['last_name']) ? $valuee['last_name'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '34'){
                  $conditiondata['condition_type'] = 34;
                  $conditiondata['phone_number'] = isset($valuee['phone_number']) ? $valuee['phone_number'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '35'){
                  $conditiondata['condition_type'] = 35;
                  $conditiondata['email'] = isset($valuee['email']) ? $valuee['email'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '36'){
                  $conditiondata['condition_type'] = 36;
                  $conditiondata['date_of_birth'] = isset($valuee['date_of_birth']) ? $valuee['date_of_birth'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '37'){
                  $conditiondata['condition_type'] = 37;
                  $conditiondata['gender'] = $valuee['gender']['value'] ? $valuee['gender']['value'] : null ;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '38'){
                  $conditiondata['condition_type'] = 38;
                  $conditiondata['group_id'] = $valuee['group']['value'] ? $valuee['group']['value'] : null ;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '39'){
                  $conditiondata['condition_type'] = 39;
                  $conditiondata['newsletter_id'] = $valuee['newsletter']['value'] ? $valuee['newsletter']['value'] : null ;
            }
            ////
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '40'){
                  $conditiondata['condition_type'] = 40;
                  $conditiondata['wishlist_tag_id'] = isset($valuee['wishlist_tags']) ? implode(',', array_column($valuee['wishlist_tags'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '41'){
                  $conditiondata['condition_type'] = 41;
                  $conditiondata['wishlist_brand_id'] = isset($valuee['wishlist_brands']) ? implode(',', array_column($valuee['wishlist_brands'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '42'){
                  $conditiondata['condition_type'] = 42;
                  $conditiondata['wishlist_category_id'] = isset($valuee['wishlist_categories']) ? implode(',', array_column($valuee['wishlist_categories'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '43'){
                  $conditiondata['condition_type'] = 43;
                  $conditiondata['wishlist_attribute'] = isset($valuee['wishlist_attribute']) ? $valuee['wishlist_attribute']['value'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '44'){
                  $conditiondata['condition_type'] = 44;
                  $conditiondata['wishlist_new'] = isset($valuee['wishlist_new']) ? $valuee['wishlist_new']['value'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '45'){
                  $conditiondata['condition_type'] = 45;
                  $conditiondata['wishlist_sku'] = isset($valuee['wishlist_sku']) ? implode(',', array_column($valuee['wishlist_sku'], 'value')) : null;
            }
            
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '46'){
                  $conditiondata['condition_type'] = 46;
                  $conditiondata['wishlist_sale'] = isset($valuee['wishlist_sale']) ? $valuee['wishlist_sale']['value'] : null;
            }

            ////

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '48'){
                  $conditiondata['condition_type'] = 48;
                  $conditiondata['cart_created_day'] = isset($valuee['cart_created_day']) ? $valuee['cart_created_day'] : 0;
            }
            
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '49'){
                  $conditiondata['condition_type'] = 49;
                  $conditiondata['cart_modified_day'] = isset($valuee['cart_modified_day']) ? $valuee['cart_modified_day'] : 0;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '50'){
                  $conditiondata['condition_type'] = 50;
                  $conditiondata['cart_tag_id'] = isset($valuee['cart_tags']) ? implode(',', array_column($valuee['cart_tags'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '51'){
                  $conditiondata['condition_type'] = 51;
                  $conditiondata['cart_brand_id'] = isset($valuee['cart_brands']) ? implode(',', array_column($valuee['cart_brands'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '52'){
                  $conditiondata['condition_type'] = 52;
                  $conditiondata['cart_category_id'] = isset($valuee['cart_categories']) ? implode(',', array_column($valuee['cart_categories'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '53'){
                  $conditiondata['condition_type'] = 53;
                  $conditiondata['cart_attribute'] = isset($valuee['cart_attribute']) ? $valuee['cart_attribute']['value'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '54'){
                  $conditiondata['condition_type'] = 54;
                  $conditiondata['cart_new'] = isset($valuee['cart_new']) ? $valuee['cart_new']['value'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '55'){
                  $conditiondata['condition_type'] = 55;
                  $conditiondata['cart_sku'] = isset($valuee['cart_sku']) ? implode(',', array_column($valuee['cart_sku'], 'value')) : null;
            }
            
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '56'){
                  $conditiondata['condition_type'] = 56;
                  $conditiondata['cart_sale'] = isset($valuee['cart_sale']) ? $valuee['cart_sale']['value'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '57'){
                  $conditiondata['condition_type'] = 57;
                  $conditiondata['product_count'] = isset($valuee['product_count']) ? $valuee['product_count'] : 0;
            }
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '58'){
                  $conditiondata['condition_type'] = 58;
                  $conditiondata['grand_total'] = isset($valuee['grand_total']) ? $valuee['grand_total'] : 0;
            }

            CustomerSegmentationCondition::create($conditiondata);
      }
    }
    
    static function UpdateConditionsetup($data,$segmetation_id){
        $con_data = CustomerSegmentationCondition::where('condition_id', '=',$segmetation_id)->get();
        $con_data->each->delete();
            
        foreach ($data['conditiondata'] as $keyy => $valuee) {
            $conditiondata = [
                  'condition_id' => $segmetation_id,
            ];
            
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '4'){
                  $conditiondata['condition_type'] = 4;
                  $conditiondata['first_order_completion_days'] = isset($valuee['first_order_date']) ? $valuee['first_order_date'] : 0;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '5'){
                  $conditiondata['condition_type'] = 5;
                  $conditiondata['last_order_completion_days'] = isset($valuee['last_order_date']) ? $valuee['last_order_date'] : 0;
            }
                
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '6'){
                  $conditiondata['condition_type'] = 6;
                  $conditiondata['payment_method_id'] = isset($valuee['paymentMethod']) ? implode(',', array_column($valuee['paymentMethod'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '7'){
                  $conditiondata['condition_type'] = 7;
                  $conditiondata['shipping_method_id'] = isset($valuee['shippingMethod']) ? implode(',', array_column($valuee['shippingMethod'], 'value')) : null;
            }
            
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '8'){
                  $conditiondata['condition_type'] = 8;
                  $conditiondata['coupon'] = isset($valuee['paymentMethod']) ? implode(',', array_column($valuee['coupon'], 'label')) : null;
            }

             if(isset($valuee['type']['value']) && $valuee['type']['value'] == '9'){
                  $conditiondata['condition_type'] = 9;
                  $conditiondata['order_qty'] = isset($valuee['order_qty']) ? $valuee['order_qty'] : 0;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '10'){
                  $conditiondata['condition_type'] = 10;
                  $conditiondata['total_amount'] = isset($valuee['total_amount']) ? $valuee['total_amount'] : 0;
            }
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '11'){
                  $conditiondata['condition_type'] = 11;
                  $conditiondata['average_order_total'] = isset($valuee['average_order_total']) ? $valuee['average_order_total'] : 0;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '12'){
                  $conditiondata['condition_type'] = 12;
                  $conditiondata['total_product_qty'] = isset($valuee['total_product_qty']) ? $valuee['total_product_qty'] : 0;
            }
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '14'){
                  $conditiondata['condition_type'] = 14;
                  $conditiondata['billing_area_id'] = isset($valuee['billing_area']) ? implode(',', array_column($valuee['billing_area'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '15'){
                  $conditiondata['condition_type'] = 15;
                  $conditiondata['billing_city_id'] = isset($valuee['billing_city']) ? implode(',', array_column($valuee['billing_city'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '16'){
                  $conditiondata['condition_type'] = 16;
                  $conditiondata['billing_state_id'] = isset($valuee['billing_state']) ? implode(',', array_column($valuee['billing_state'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '17'){
                  $conditiondata['condition_type'] = 17;
                  $conditiondata['billing_country_id'] = isset($valuee['billing_country']) ? implode(',', array_column($valuee['billing_country'], 'value')) : null;
            }
            
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '18'){
                  $conditiondata['condition_type'] = 18;
                  $conditiondata['billing_zip'] = isset($valuee['billing_zip']) ? $valuee['billing_zip'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '20'){
                  $conditiondata['condition_type'] = 20;
                  $conditiondata['shipping_area_id'] = isset($valuee['shipping_area']) ? implode(',', array_column($valuee['shipping_area'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '21'){
                  $conditiondata['condition_type'] = 21;
                  $conditiondata['shipping_city_id'] = isset($valuee['shipping_city']) ? implode(',', array_column($valuee['shipping_city'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '22'){
                  $conditiondata['condition_type'] = 22;
                  $conditiondata['shipping_state_id'] = isset($valuee['shipping_state']) ? implode(',', array_column($valuee['shipping_state'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '23'){
                  $conditiondata['condition_type'] = 23;
                  $conditiondata['shipping_country_id'] = isset($valuee['shipping_country']) ? implode(',', array_column($valuee['shipping_country'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '24'){
                  $conditiondata['condition_type'] = 24;
                  $conditiondata['shipping_zip'] = isset($valuee['shipping_zip']) ? $valuee['shipping_zip'] : null;
            }
            
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '26'){
                  $conditiondata['condition_type'] = 26;
                  $conditiondata['associate_website_id'] = $valuee['associate_website']['value'] ? $valuee['associate_website']['value'] : null ;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '27'){
                  $conditiondata['condition_type'] = 27;
                  $conditiondata['days_after_birth'] = isset($valuee['days_after_birth']) ? $valuee['days_after_birth'] : 0;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '28'){
                  $conditiondata['condition_type'] = 28;
                  $conditiondata['days_before_birth'] = isset($valuee['days_before_birth']) ? $valuee['days_before_birth'] : 0;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '29'){
                  $conditiondata['condition_type'] = 29;
                  $conditiondata['days_last_visit'] = isset($valuee['days_last_visit']) ? $valuee['days_last_visit'] : 0;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '30'){
                  $conditiondata['condition_type'] = 30;
                  $conditiondata['days_from_register'] = isset($valuee['days_from_register']) ? $valuee['days_from_register'] : 0;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '31'){
                  $conditiondata['condition_type'] = 31;
                  $conditiondata['first_name'] = isset($valuee['first_name']) ? $valuee['first_name'] : null;
            }  

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '32'){
                  $conditiondata['condition_type'] = 32;
                  $conditiondata['middle_name'] = isset($valuee['middle_name']) ? $valuee['middle_name'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '33'){
                  $conditiondata['condition_type'] = 33;
                  $conditiondata['last_name'] = isset($valuee['last_name']) ? $valuee['last_name'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '34'){
                  $conditiondata['condition_type'] = 34;
                  $conditiondata['phone_number'] = isset($valuee['phone_number']) ? $valuee['phone_number'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '35'){
                  $conditiondata['condition_type'] = 35;
                  $conditiondata['email'] = isset($valuee['email']) ? $valuee['email'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '36'){
                  $conditiondata['condition_type'] = 36;
                  $conditiondata['date_of_birth'] = isset($valuee['date_of_birth']) ? $valuee['date_of_birth'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '37'){
                  $conditiondata['condition_type'] = 37;
                  $conditiondata['gender'] = $valuee['gender']['value'] ? $valuee['gender']['value'] : null ;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '38'){
                  $conditiondata['condition_type'] = 38;
                  $conditiondata['group_id'] = $valuee['group']['value'] ? $valuee['group']['value'] : null ;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '39'){
                  $conditiondata['condition_type'] = 39;
                  $conditiondata['newsletter_id'] = $valuee['newsletter']['value'] ? $valuee['newsletter']['value'] : null ;
            }
            ////
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '40'){
                  $conditiondata['condition_type'] = 40;
                  $conditiondata['wishlist_tag_id'] = isset($valuee['wishlist_tags']) ? implode(',', array_column($valuee['wishlist_tags'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '41'){
                  $conditiondata['condition_type'] = 41;
                  $conditiondata['wishlist_brand_id'] = isset($valuee['wishlist_brands']) ? implode(',', array_column($valuee['wishlist_brands'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '42'){
                  $conditiondata['condition_type'] = 42;
                  $conditiondata['wishlist_category_id'] = isset($valuee['wishlist_categories']) ? implode(',', array_column($valuee['wishlist_categories'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '43'){
                  $conditiondata['condition_type'] = 43;
                  $conditiondata['wishlist_attribute'] = isset($valuee['wishlist_attribute']) ? $valuee['wishlist_attribute']['value'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '44'){
                  $conditiondata['condition_type'] = 44;
                  $conditiondata['wishlist_new'] = isset($valuee['wishlist_new']) ? $valuee['wishlist_new']['value'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '45'){
                  $conditiondata['condition_type'] = 45;
                  $conditiondata['wishlist_sku'] = isset($valuee['wishlist_sku']) ? implode(',', array_column($valuee['wishlist_sku'], 'value')) : null;
            }
            
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '46'){
                  $conditiondata['condition_type'] = 46;
                  $conditiondata['wishlist_sale'] = isset($valuee['wishlist_sale']) ? $valuee['wishlist_sale']['value'] : null;
            }

            ////

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '48'){
                  $conditiondata['condition_type'] = 48;
                  $conditiondata['cart_created_day'] = isset($valuee['cart_created_day']) ? $valuee['cart_created_day'] : 0;
            }
            
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '49'){
                  $conditiondata['condition_type'] = 49;
                  $conditiondata['cart_modified_day'] = isset($valuee['cart_modified_day']) ? $valuee['cart_modified_day'] : 0;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '50'){
                  $conditiondata['condition_type'] = 50;
                  $conditiondata['cart_tag_id'] = isset($valuee['cart_tags']) ? implode(',', array_column($valuee['cart_tags'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '51'){
                  $conditiondata['condition_type'] = 51;
                  $conditiondata['cart_brand_id'] = isset($valuee['cart_brands']) ? implode(',', array_column($valuee['cart_brands'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '52'){
                  $conditiondata['condition_type'] = 52;
                  $conditiondata['cart_category_id'] = isset($valuee['cart_categories']) ? implode(',', array_column($valuee['cart_categories'], 'value')) : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '53'){
                  $conditiondata['condition_type'] = 53;
                  $conditiondata['cart_attribute'] = isset($valuee['cart_attribute']) ? $valuee['cart_attribute']['value'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '54'){
                  $conditiondata['condition_type'] = 54;
                  $conditiondata['cart_new'] = isset($valuee['cart_new']) ? $valuee['cart_new']['value'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '55'){
                  $conditiondata['condition_type'] = 55;
                  $conditiondata['cart_sku'] = isset($valuee['cart_sku']) ? implode(',', array_column($valuee['cart_sku'], 'value')) : null;
            }
            
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '56'){
                  $conditiondata['condition_type'] = 56;
                  $conditiondata['cart_sale'] = isset($valuee['cart_sale']) ? $valuee['cart_sale']['value'] : null;
            }

            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '57'){
                  $conditiondata['condition_type'] = 57;
                  $conditiondata['product_count'] = isset($valuee['product_count']) ? $valuee['product_count'] : 0;
            }
            if(isset($valuee['type']['value']) && $valuee['type']['value'] == '58'){
                  $conditiondata['condition_type'] = 58;
                  $conditiondata['grand_total'] = isset($valuee['grand_total']) ? $valuee['grand_total'] : 0;
            }

            CustomerSegmentationCondition::create($conditiondata);
      }
        
    }
}