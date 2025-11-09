# 優化版本的路徑安全計算
# 這個版本直接使用 OSRM 的路徑資料，不需要查詢所有道路

@app.route('/get_route_safety_optimized', methods=['POST'])
def get_route_safety_optimized():
    """
    優化版本：直接使用 OSRM 的路徑座標
    不需要查詢 Overpass API
    """
    data = request.get_json()
    
    # 從前端接收 OSRM 的路徑座標
    route_coordinates = data.get('route_coordinates')  # [[lat, lng], [lat, lng], ...]
    radius_m = data.get('radius_m', 200)
    
    if not route_coordinates or len(route_coordinates) < 2:
        return jsonify({"error": "Invalid route coordinates"}), 400
    
    print(f"Analyzing route with {len(route_coordinates)} points")
    
    # Fetch safety data once
    try:
        cctv_data = fetch_api_data("d317a3c4-ff08-48af-894e-31dfb5155de3")
        mrt_data = fetch_api_data("307a7f61-e302-4108-a817-877ccbfca7c1")
        robbery_data = fetch_api_data("6ecb4c41-fbc9-4b04-b182-a7da6c780f8d")
        streetlight_data = fetch_streetlight_data()
        police_data = load_police_data()
    except Exception as e:
        return jsonify({"error": f"Failed to fetch safety data: {str(e)}"}), 500
    
    # 將路徑分段（每 10 個點取樣一次，避免計算太多次）
    sample_interval = max(1, len(route_coordinates) // 20)  # 最多 20 個取樣點
    sample_points = route_coordinates[::sample_interval]
    
    # 確保終點被包含
    if route_coordinates[-1] not in sample_points:
        sample_points.append(route_coordinates[-1])
    
    print(f"Sampling {len(sample_points)} points from route")
    
    # 對每個取樣點計算周圍的安全資源
    route_segments = []
    total_cctv = 0
    total_metro = 0
    total_robbery = 0
    total_streetlight = 0
    total_police = 0
    
    for i, coord in enumerate(sample_points):
        lat, lng = coord
        
        # Get safety features around this point
        features = get_safety_features_in_radius(
            lat, lng, radius_m, 
            cctv_data, mrt_data, robbery_data, streetlight_data, police_data
        )
        
        # Count by type
        cctv_count = sum(1 for f in features if f['type'] == 'cctv')
        metro_count = sum(1 for f in features if f['type'] == 'metro')
        robbery_count = sum(1 for f in features if f['type'] == 'robbery_incident')
        streetlight_count = sum(1 for f in features if f['type'] == 'streetlight')
        police_count = sum(1 for f in features if f['type'] == 'police')
        
        # Calculate segment safety score
        segment_score = calculate_safety_score(
            cctv_count=cctv_count,
            lamp_count=streetlight_count,
            mrt_count=metro_count,
            police_count=police_count,
            theft_count=0,
            robbery_count=robbery_count,
            store_count=0
        )
        
        route_segments.append({
            'segment_index': i,
            'location': {'lat': lat, 'lng': lng},
            'cctv_count': cctv_count,
            'metro_count': metro_count,
            'robbery_count': robbery_count,
            'streetlight_count': streetlight_count,
            'police_count': police_count,
            'safety_score': segment_score
        })
        
        total_cctv += cctv_count
        total_metro += metro_count
        total_robbery += robbery_count
        total_streetlight += streetlight_count
        total_police += police_count
    
    # Calculate overall route safety score
    overall_score = calculate_safety_score(
        cctv_count=total_cctv,
        lamp_count=total_streetlight,
        mrt_count=total_metro,
        police_count=total_police,
        theft_count=0,
        robbery_count=total_robbery,
        store_count=0
    )
    
    # Construct response
    response_data = {
        'route': {
            'total_points': len(route_coordinates),
            'sampled_points': len(sample_points),
            'radius_m': radius_m
        },
        'summary': {
            'total_segments': len(route_segments),
            'total_cctv': total_cctv,
            'total_metro': total_metro,
            'total_robbery': total_robbery,
            'total_streetlight': total_streetlight,
            'total_police': total_police,
            'overall_score': overall_score
        },
        'segments': route_segments
    }
    
    return jsonify(response_data)
