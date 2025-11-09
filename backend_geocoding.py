#!/usr/bin/env python3
"""
後端地理編碼服務 - 針對台北中文地址優化
不依賴 LibPostal，使用自定義的地址標準化邏輯
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import re
import time
from typing import Dict, List, Optional

app = Flask(__name__)
CORS(app)

class TaipeiAddressNormalizer:
    """台北地址標準化器"""
    
    # 台北區域對照
    TAIPEI_DISTRICTS = [
        '中正區', '大同區', '中山區', '松山區', '大安區', '萬華區',
        '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區'
    ]
    
    # 常見地標
    LANDMARKS = {
        '台北101': '台北市信義區信義路五段7號',
        '臺北101': '台北市信義區信義路五段7號',
        '台北車站': '台北市中正區北平西路3號',
        '臺北車站': '台北市中正區北平西路3號',
        '台北市政府': '台北市信義區市府路1號',
        '臺北市政府': '台北市信義區市府路1號',
        '國立台灣大學': '台北市大安區羅斯福路四段1號',
        '國立臺灣大學': '台北市大安區羅斯福路四段1號',
        '台大': '台北市大安區羅斯福路四段1號',
        '臺大': '台北市大安區羅斯福路四段1號',
        '西門町': '台北市萬華區成都路',
        '士林夜市': '台北市士林區基河路',
        '中正紀念堂': '台北市中正區中山南路21號',
        '台北小巨蛋': '台北市松山區南京東路四段2號',
        '松山機場': '台北市松山區敦化北路340-9號',
        '松山車站': '台北市信義區松山路11號',
        '南港車站': '台北市南港區南港路一段313號',
        '信義商圈': '台北市信義區',
        '東區': '台北市大安區',
        '西門': '台北市萬華區',
    }
    
    def normalize(self, address: str) -> List[str]:
        """
        標準化地址，返回可能的地址變體
        
        Args:
            address: 原始地址
            
        Returns:
            標準化後的地址列表（按優先級排序）
        """
        variants = []
        
        # 1. 檢查是否為地標
        if address in self.LANDMARKS:
            variants.append(self.LANDMARKS[address])
            variants.append(address)  # 也保留原始地標名稱
            return variants
        
        # 2. 標準化「臺北」為「台北」
        normalized = address.replace('臺北', '台北')
        
        # 3. 如果沒有「台北」，加上「台北市」
        if '台北' not in normalized:
            variants.append(f'台北市 {normalized}')
            variants.append(f'台北 {normalized}')
        
        # 4. 添加原始地址
        variants.append(normalized)
        
        # 5. 如果包含區域但沒有「台北市」，補上
        for district in self.TAIPEI_DISTRICTS:
            if district in normalized and '台北市' not in normalized:
                variants.append(f'台北市{normalized}')
                break
        
        # 6. 移除重複
        seen = set()
        unique_variants = []
        for v in variants:
            if v not in seen:
                seen.add(v)
                unique_variants.append(v)
        
        return unique_variants

class GeocodingService:
    """地理編碼服務"""
    
    def __init__(self):
        self.normalizer = TaipeiAddressNormalizer()
        self.nominatim_url = "https://nominatim.openstreetmap.org/search"
        self.headers = {'User-Agent': 'TaipeiRoadSafetyApp/1.0'}
        self.last_request_time = 0
        self.min_request_interval = 1.0  # Nominatim 要求每秒最多1個請求
    
    def geocode_with_nominatim(self, address: str) -> Optional[Dict]:
        """使用 Nominatim 進行地理編碼"""
        try:
            # 遵守請求頻率限制
            current_time = time.time()
            time_since_last = current_time - self.last_request_time
            if time_since_last < self.min_request_interval:
                sleep_time = self.min_request_interval - time_since_last
                print(f"    ⏳ 等待 {sleep_time:.1f}秒...", flush=True)
                time.sleep(sleep_time)
            
            params = {
                'q': address,
                'format': 'json',
                'limit': 1,
                'countrycodes': 'tw',
                'accept-language': 'zh-TW',
                'bounded': 1,
                'viewbox': '121.4,25.2,121.7,24.9',  # 台北市範圍
            }
            
            print(f"    → 請求 Nominatim...", end='', flush=True)
            
            response = requests.get(
                self.nominatim_url,
                params=params,
                headers=self.headers,
                timeout=5  # 縮短超時時間
            )
            
            self.last_request_time = time.time()
            
            print(f" 狀態碼: {response.status_code}", flush=True)
            
            if response.status_code == 200:
                data = response.json()
                if len(data) > 0:
                    result = data[0]
                    return {
                        'lat': float(result['lat']),
                        'lng': float(result['lon']),
                        'display_name': result['display_name'],
                        'importance': result.get('importance', 0)
                    }
            
            return None
            
        except requests.Timeout:
            print(f" ⏱️  超時", flush=True)
            return None
        except Exception as e:
            print(f" ❌ 錯誤: {e}", flush=True)
            return None
    
    def geocode(self, address: str) -> Optional[Dict]:
        """
        完整的地理編碼流程
        
        Args:
            address: 要編碼的地址
            
        Returns:
            包含 lat, lng, display_name 的字典，或 None
        """
        print(f"\n🔍 地理編碼: {address}")
        
        # 獲取地址變體
        variants = self.normalizer.normalize(address)
        print(f"📋 生成 {len(variants)} 個地址變體")
        
        # 嘗試每個變體
        for i, variant in enumerate(variants, 1):
            print(f"  {i}. 嘗試: {variant}")
            result = self.geocode_with_nominatim(variant)
            
            if result:
                print(f"  ✅ 成功! ({result['lat']}, {result['lng']})")
                result['original_address'] = address
                result['used_variant'] = variant
                return result
        
        print(f"  ❌ 所有變體都失敗")
        return None

# 創建全局服務實例
geocoding_service = GeocodingService()

@app.route('/geocode', methods=['POST'])
def geocode_endpoint():
    """地理編碼 API endpoint"""
    try:
        data = request.get_json()
        address = data.get('address') or data.get('location')
        
        if not address:
            return jsonify({"error": "缺少 address 或 location 參數"}), 400
        
        result = geocoding_service.geocode(address)
        
        if result:
            return jsonify({
                'success': True,
                'lat': result['lat'],
                'lng': result['lng'],
                'display_name': result['display_name'],
                'original_address': result['original_address'],
                'used_variant': result['used_variant']
            })
        else:
            return jsonify({
                'success': False,
                'error': f'找不到地點: {address}'
            }), 404
            
    except Exception as e:
        print(f"❌ 錯誤: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """健康檢查"""
    return jsonify({"status": "ok", "service": "geocoding"})

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 啟動地理編碼服務")
    print("="*60)
    print("端口: 5002")
    print("API: POST /geocode")
    print("範例: curl -X POST http://localhost:5002/geocode -H 'Content-Type: application/json' -d '{\"address\":\"台北101\"}'")
    print("="*60 + "\n")
    
    app.run(debug=True, port=5002)
