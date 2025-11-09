from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import math
from datetime import datetime
import overpy
import time
import urllib.parse
import pandas as pd
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
overpass_api = overpy.Overpass()

# Cache for API data
POLICE_DATA_CACHE = None
CCTV_DATA_CACHE = None
MRT_DATA_CACHE = None
ROBBERY_DATA_CACHE = None
API_CACHE_TIME = {}
API_CACHE_DURATION = 1800  # Cache for 30 minutes

def load_police_data():
    """Load police station data from local ODS file"""
    global POLICE_DATA_CACHE
    if POLICE_DATA_CACHE is not None:
        return POLICE_DATA_CACHE
    
    try:
        # Read ODS file
        df = pd.read_excel('police.ods', engine='odf')
        
        # Convert to list of dicts and cache
        POLICE_DATA_CACHE = df.to_dict('records')
        print(f"Loaded {len(POLICE_DATA_CACHE)} police stations from local file")
        return POLICE_DATA_CACHE
    except Exception as e:
        print(f"Error loading police data from ODS: {e}")
        return []

def fetch_api_data_cached(resource_id, cache_name, limit=1000, offset=0):
    """Fetch API data with caching"""
    global API_CACHE_TIME
    
    # Check cache
    cache_var = globals().get(cache_name)
    if cache_var is not None and cache_name in API_CACHE_TIME:
        cache_age = time.time() - API_CACHE_TIME[cache_name]
        if cache_age < API_CACHE_DURATION:
            print(f"Using cached {cache_name} ({len(cache_var)} items, age: {int(cache_age)}s)")
            return cache_var
    
    # Fetch fresh data
    print(f"Fetching {cache_name} from API...")
    data = fetch_api_data(resource_id, limit, offset)
    
    # Update cache
    globals()[cache_name] = data
    API_CACHE_TIME[cache_name] = time.time()
    print(f"Cached {cache_name}: {len(data)} items")
    
    return data

# Haversine formula to calculate distance between two points in meters
def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# Safety score calculation functions
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))

def normalize_count(count, max_expected):
    return clamp(count / max_expected, 0.0, 1.0) if max_expected > 0 else 0.0

def police_score(dist_m, max_range=1000.0):
    return clamp((max_range - dist_m) / max_range, 0.0, 1.0) if max_range > 0 else 0.0

def calculate_safety_score(cctv_count, lamp_count, mrt_count, police_count, theft_count, robbery_count, 
                           store_count=0, cctv_max=5, lamp_max=10, mrt_max=3, police_max=1, 
                           theft_ref=5, robbery_ref=2, store_max=3):
    """
    Calculate safety score based on normalized counts
    Returns a score between 0-100
    
    Formula: 0.3*S + 0.1*C + 0.05*L + 0.3*P + 0.2*M - 0.4*Rt - 0.5*Rr
    Where:
    - S: 24-hour convenience store density (0~1)
    - C: CCTV count density (0~1)
    - L: Streetlight density (0~1)
    - P: Police station proximity (0~1)
    - M: MRT exit count (0~1)
    - Rt: Theft case density (0~1)
    - Rr: Robbery case density (0~1)
    """
    S = clamp(store_count / store_max, 0.0, 1.0) if store_max > 0 else 0.0
    C = clamp(cctv_count / cctv_max, 0.0, 1.0) if cctv_max > 0 else 0.0
    L = clamp(lamp_count / lamp_max, 0.0, 1.0) if lamp_max > 0 else 0.0
    P = clamp(police_count / police_max, 0.0, 1.0) if police_max > 0 else 0.0
    M = clamp(mrt_count / mrt_max, 0.0, 1.0) if mrt_max > 0 else 0.0
    Rt = clamp(theft_count / theft_ref, 0.0, 1.0) if theft_ref > 0 else 0.0
    Rr = clamp(robbery_count / robbery_ref, 0.0, 1.0) if robbery_ref > 0 else 0.0
    
    raw_score = 0.3*S + 0.1*C + 0.5*L + 0.8*P + 0.7*M - 0.4*Rt - 0.5*Rr
    clamped_score = clamp(raw_score, 0.0, 1.0)
    return round(clamped_score * 100, 2)

# Function to fetch data from a given resource_id
def fetch_api_data(resource_id, limit=1000, offset=0):
    api_url = "https://data.taipei/api/v1/dataset/" + resource_id + "?scope=resourceAquire"
    params = {
        "resource_id": resource_id,
        "limit": limit,
        "offset": offset
    }
    response = requests.get(api_url, params=params)
    if response.status_code != 200:
        raise Exception("Failed to fetch API data for resource_id: " + resource_id)
    data = response.json()
    return data.get('result', {}).get('results', [])

# Function to convert TWD97 to WGS84 (simplified conversion for Taipei area)
def twd97_to_wgs84(x, y):
    # TWD97 TM2 zone parameters
    a = 6378137.0  # Semi-major axis
    b = 6356752.314245  # Semi-minor axis
    lon0 = math.radians(121)  # Central meridian for TM2 zone
    k0 = 0.9999  # Scale factor
    dx = 250000  # False easting
    
    # Calculate parameters
    e = math.sqrt(1 - (b**2 / a**2))
    e2 = e**2 / (1 - e**2)
    
    # Remove false easting
    x = x - dx
    y = y
    
    # Calculate footpoint latitude
    M = y / k0
    mu = M / (a * (1 - e**2/4 - 3*e**4/64 - 5*e**6/256))
    
    e1 = (1 - math.sqrt(1 - e**2)) / (1 + math.sqrt(1 - e**2))
    
    phi1 = mu + (3*e1/2 - 27*e1**3/32) * math.sin(2*mu) + \
           (21*e1**2/16 - 55*e1**4/32) * math.sin(4*mu) + \
           (151*e1**3/96) * math.sin(6*mu)
    
    # Calculate latitude and longitude
    C1 = e2 * math.cos(phi1)**2
    T1 = math.tan(phi1)**2
    N1 = a / math.sqrt(1 - e**2 * math.sin(phi1)**2)
    R1 = a * (1 - e**2) / ((1 - e**2 * math.sin(phi1)**2)**1.5)
    D = x / (N1 * k0)
    
    lat = phi1 - (N1 * math.tan(phi1) / R1) * \
          (D**2/2 - (5 + 3*T1 + 10*C1 - 4*C1**2 - 9*e2) * D**4/24 + \
           (61 + 90*T1 + 298*C1 + 45*T1**2 - 252*e2 - 3*C1**2) * D**6/720)
    
    lon = lon0 + (D - (1 + 2*T1 + C1) * D**3/6 + \
                  (5 - 2*C1 + 28*T1 - 3*C1**2 + 8*e2 + 24*T1**2) * D**5/120) / math.cos(phi1)
    
    return math.degrees(lat), math.degrees(lon)

# Function to geocode address to lat/lng using Taiwan government geocoding service
def geocode_address(address, max_retries=3):
    """Convert address to latitude and longitude using Taiwan MOI geocoding service"""
    for attempt in range(max_retries):
        try:
            # Use Taiwan MOI Address Geocoding Service
            url = "https://api.nlsc.gov.tw/other/TownVillagePointQuery/"
            params = {
                'address': address,
                'format': 'json'
            }
            
            response = requests.get(url, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    # MOI service returns TWD97 coordinates, need to convert
                    x = float(data[0].get('x', 0))
                    y = float(data[0].get('y', 0))
                    if x > 0 and y > 0:
                        lat, lng = twd97_to_wgs84(x, y)
                        return lat, lng
            
            return None, None
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(0.5)  # Wait before retry
                continue
            print(f"Geocoding failed for address: {address}, error: {e}")
            return None, None
    return None, None

# Cache for streetlight data
STREETLIGHT_DATA_CACHE = None
STREETLIGHT_CACHE_TIME = None
STREETLIGHT_CACHE_DURATION = 3600  # Cache for 1 hour

# Function to fetch streetlight data from blob storage
def fetch_streetlight_data():
    global STREETLIGHT_DATA_CACHE, STREETLIGHT_CACHE_TIME
    
    # Check if cache is valid
    if STREETLIGHT_DATA_CACHE is not None and STREETLIGHT_CACHE_TIME is not None:
        cache_age = time.time() - STREETLIGHT_CACHE_TIME
        if cache_age < STREETLIGHT_CACHE_DURATION:
            print(f"Using cached streetlight data ({len(STREETLIGHT_DATA_CACHE)} items, age: {int(cache_age)}s)")
            return STREETLIGHT_DATA_CACHE
    
    print("Fetching streetlight data from Azure Blob Storage...")
    url = "https://tppkl.blob.core.windows.net/blobfs/TaipeiLight.json"
    
    try:
        # Add timeout to prevent hanging
        response = requests.get(url, timeout=30)
        if response.status_code != 200:
            raise Exception(f"Failed to fetch streetlight data: HTTP {response.status_code}")
        
        print("Parsing streetlight JSON data...")
        raw_data = response.json()
        print(f"Converting {len(raw_data)} streetlight coordinates...")
        
        # Convert TWD97 coordinates to WGS84


        
        converted_data = []
        for idx, item in enumerate(raw_data):
            if idx % 10000 == 0 and idx > 0:
                print(f"  Converted {idx}/{len(raw_data)} streetlights...")
            
            try:
                twd97_x = float(item['TWD97X'])
                twd97_y = float(item['TWD97Y'])
                lat, lng = twd97_to_wgs84(twd97_x, twd97_y)
                
                converted_item = item.copy()
                converted_item['緯度'] = lat
                converted_item['經度'] = lng
                converted_item['燈號'] = item.get('SerialNumber', 'Unknown')
                converted_data.append(converted_item)
            except (KeyError, ValueError):
                continue
        
        # Cache the result
        STREETLIGHT_DATA_CACHE = converted_data
        STREETLIGHT_CACHE_TIME = time.time()
        print(f"Streetlight data cached: {len(converted_data)} items")
        
        return converted_data
    
    except requests.Timeout:
        print("ERROR: Streetlight data fetch timed out after 30 seconds")
        raise Exception("Streetlight data fetch timed out")
    except Exception as e:
        print(f"ERROR: Failed to fetch streetlight data: {str(e)}")
        raise

# API endpoint to fetch CCTV, MRT and robbery incident data and transform it
@app.route('/ㄋ', methods=['GET'])
def get_safety_data():
    # Get parameters from query string
    at = request.args.get('at', '2025-11-08T23:00:00+08:00')  # Default to example
    center_lat = float(request.args.get('center_lat', 25.033964))
    center_lng = float(request.args.get('center_lng', 121.564468))
    radius_m = int(request.args.get('radius_m', 200))
    tz = request.args.get('tz', 'Asia/Taipei')

    places = []

    # Fetch and process CCTV data (with caching)
    try:
        cctv_results = fetch_api_data_cached("d317a3c4-ff08-48af-894e-31dfb5155de3", "CCTV_DATA_CACHE")
        for item in cctv_results:
            try:
                lat = float(item['wgsy'])
                lng = float(item['wgsx'])
                distance = haversine(center_lat, center_lng, lat, lng)
                if distance <= radius_m:
                    places.append({
                        "safety": 1,
                        "type": "cctv",
                        "name": item['攝影機編號'],
                        "location": {"lat": lat, "lng": lng},
                        "distance_m": round(distance),
                        "phone": item.get('電話', '')
                    })
            except (KeyError, ValueError):
                continue  # Skip invalid entries
    except Exception as e:
        print(f"Error fetching CCTV data: {e}")

    # Fetch and process MRT exit data (with caching)
    try:
        mrt_results = fetch_api_data_cached("307a7f61-e302-4108-a817-877ccbfca7c1", "MRT_DATA_CACHE")
        for item in mrt_results:
            try:
                lat = float(item['緯度'])
                lng = float(item['經度'])
                distance = haversine(center_lat, center_lng, lat, lng)
                if distance <= radius_m:
                    places.append({
                        "safety": 1,
                        "type": "metro",
                        "name": item['出入口名稱'],
                        "location": {"lat": lat, "lng": lng},
                        "distance_m": round(distance),
                        "phone": item.get('電話', '')
                    })
            except (KeyError, ValueError):
                continue  # Skip invalid entries
    except Exception as e:
        print(f"Error fetching MRT data: {e}")

    # Fetch and process robbery incident data (with caching)
    try:
        robbery_results = fetch_api_data_cached("6ecb4c41-fbc9-4b04-b182-a7da6c780f8d", "ROBBERY_DATA_CACHE")
        for item in robbery_results:
            try:
                lat = float(item['緯度'])
                lng = float(item['經度'])
                distance = haversine(center_lat, center_lng, lat, lng)
                if distance <= radius_m:
                    places.append({
                        "safety": -1,  # Negative safety indicator
                        "type": "robbery_incident",
                        "name": f"搶奪案件 - {item.get('發生日期', 'Unknown')}",
                        "location": {"lat": lat, "lng": lng},
                        "distance_m": round(distance),
                        "incident_date": item.get('發生日期', ''),
                        "incident_time": item.get('發生時段', ''),
                        "location_desc": item.get('發生地點', ''),
                        "phone": item.get('電話', '')
                    })
            except (KeyError, ValueError):
                continue  # Skip invalid entries
    except Exception as e:
        print(f"Error fetching robbery data: {e}")

    # Fetch and process streetlight data
    try:
        streetlight_data = fetch_streetlight_data()
        for item in streetlight_data:
            try:
                lat = float(item['緯度'])
                lng = float(item['經度'])
                distance = haversine(center_lat, center_lng, lat, lng)
                if distance <= radius_m:
                    places.append({
                        "safety": 1,
                        "type": "streetlight",
                        "name": item.get('燈號', 'Unknown'),
                        "location": {"lat": lat, "lng": lng},
                        "distance_m": round(distance),
                        "phone": item.get('電話', '')
                    })
            except (KeyError, ValueError):
                continue  # Skip invalid entries
    except Exception as e:
        print(f"Error fetching streetlight data: {e}")

    # Fetch and process police station data from local ODS file
    try:
        police_results = load_police_data()
        for item in police_results:
            try:
                # Police data has TWD97 coordinates (POINT_X, POINT_Y)
                if 'POINT_X' in item and 'POINT_Y' in item:
                    twd97_x = float(item['POINT_X'])
                    twd97_y = float(item['POINT_Y'])
                    lat, lng = twd97_to_wgs84(twd97_x, twd97_y)
                    
                    distance = haversine(center_lat, center_lng, lat, lng)
                    if distance <= radius_m:
                        name = item.get('中文單位名稱', item.get('英文單位名稱', 'Unknown Police Station'))
                        address = item.get('地址', '')
                        phone = item.get('電話', '110')
                        
                        places.append({
                            "safety": 1,
                            "type": "police",
                            "name": name,
                            "location": {"lat": lat, "lng": lng},
                            "distance_m": round(distance),
                            "phone": phone,
                            "address": address,
                            "open_now": True
                        })
            except (KeyError, ValueError, TypeError) as e:
                continue  # Skip invalid entries
    except Exception as e:
        print(f"Error processing police data: {e}")

    # Sort places by distance
    places.sort(key=lambda x: x['distance_m'])

    # Categorize resources by type (full lists for counting)
    cctv_list = [p for p in places if p['type'] == 'cctv']
    metro_list = [p for p in places if p['type'] == 'metro']
    criminal_list = [p for p in places if p['type'] == 'robbery_incident']
    light_list = [p for p in places if p['type'] == 'streetlight']
    police_list = [p for p in places if p['type'] == 'police']

    # Calculate safety score based on weights (using full counts)
    cctv_count = len(cctv_list)
    metro_count = len(metro_list)
    robbery_count = len(criminal_list)
    streetlight_count = len(light_list)
    police_count = len(police_list)
    
    # Limit resources to 2 items per category for response
    resources = {
        "cctv": cctv_list[:2],
        "metro": metro_list[:2],
        "criminal": criminal_list[:2],
        "streetlight": light_list[:2],
        "police": police_list[:2]
    }
    
    # Calculate safety score using normalized algorithm
    safety_score = calculate_safety_score(
        cctv_count=cctv_count,
        lamp_count=streetlight_count,
        mrt_count=metro_count,
        police_count=police_count,
        theft_count=0,  # No theft data in this endpoint
        robbery_count=robbery_count,
        store_count=0  # TODO: Add convenience store data
    )
    
    # Build analysis object with all values (including zeros)
    analysis = {
        "cctv_count": cctv_count,
        "metro_count": metro_count,
        "robbery_count": robbery_count,
        "streetlight_count": streetlight_count,
        "police_count": police_count
    }

    # Construct response
    response_data = {
        "meta": {
            "at": at,
            "center": {"lat": center_lat, "lng": center_lng},
            "radius_m": radius_m,
            "tz": tz
        },
        "summary": {
            "safety_score": safety_score,
            "analysis": analysis
        },
        "resources": resources
    }

    return jsonify(response_data)

# Helper function to calculate bbox from center point and radius
def calculate_bbox(center_lat, center_lng, radius_m):
    # Earth radius in meters
    R = 6371000
    
    # Calculate latitude offset (simpler, latitude degrees are roughly constant)
    lat_offset = (radius_m / R) * (180 / math.pi)
    
    # Calculate longitude offset (varies with latitude)
    lng_offset = (radius_m / R) * (180 / math.pi) / math.cos(math.radians(center_lat))
    
    # Return bbox as (south, west, north, east)
    south = center_lat - lat_offset
    north = center_lat + lat_offset
    west = center_lng - lng_offset
    east = center_lng + lng_offset
    
    return south, west, north, east

# Helper function to get CCTV, MRT, robbery, streetlight and police data within radius
def get_safety_features_in_radius(center_lat, center_lng, radius_m, cctv_data, mrt_data, robbery_data, streetlight_data, police_data):
    features = []
    
    # Check CCTV
    for item in cctv_data:
        try:
            lat = float(item['wgsy'])
            lng = float(item['wgsx'])
            distance = haversine(center_lat, center_lng, lat, lng)
            if distance <= radius_m:
                features.append({
                    'type': 'cctv',
                    'name': item['攝影機編號'],
                    'lat': lat,
                    'lng': lng,
                    'distance': distance
                })
        except (KeyError, ValueError):
            continue
    
    # Check MRT
    for item in mrt_data:
        try:
            lat = float(item['緯度'])
            lng = float(item['經度'])
            distance = haversine(center_lat, center_lng, lat, lng)
            if distance <= radius_m:
                features.append({
                    'type': 'metro',
                    'name': item['出入口名稱'],
                    'lat': lat,
                    'lng': lng,
                    'distance': distance
                })
        except (KeyError, ValueError):
            continue
    
    # Check robbery incidents
    for item in robbery_data:
        try:
            lat = float(item['緯度'])
            lng = float(item['經度'])
            distance = haversine(center_lat, center_lng, lat, lng)
            if distance <= radius_m:
                features.append({
                    'type': 'robbery_incident',
                    'name': f"搶奪案件 - {item.get('發生日期', 'Unknown')}",
                    'lat': lat,
                    'lng': lng,
                    'distance': distance,
                    'incident_date': item.get('發生日期', ''),
                    'incident_time': item.get('發生時段', '')
                })
        except (KeyError, ValueError):
            continue
    
    # Check streetlights
    for item in streetlight_data:
        try:
            lat = float(item['緯度'])
            lng = float(item['經度'])
            distance = haversine(center_lat, center_lng, lat, lng)
            if distance <= radius_m:
                features.append({
                    'type': 'streetlight',
                    'name': item.get('燈號', 'Unknown'),
                    'lat': lat,
                    'lng': lng,
                    'distance': distance
                })
        except (KeyError, ValueError):
            continue
    
    # Check police stations
    for item in police_data:
        try:
            # Police data has TWD97 coordinates (POINT_X, POINT_Y)
            if 'POINT_X' in item and 'POINT_Y' in item:
                twd97_x = float(item['POINT_X'])
                twd97_y = float(item['POINT_Y'])
                lat, lng = twd97_to_wgs84(twd97_x, twd97_y)
                
                distance = haversine(center_lat, center_lng, lat, lng)
                if distance <= radius_m:
                    name = item.get('中文單位名稱', item.get('英文單位名稱', 'Unknown Police Station'))
                    
                    features.append({
                        'type': 'police',
                        'name': name,
                        'lat': lat,
                        'lng': lng,
                        'distance': distance
                    })
        except (KeyError, ValueError, TypeError):
            continue
    
    return features

# API endpoint to get nearby roads safety score (single center point)
@app.route('/get_nearby_roads_safety', methods=['GET'])
def get_nearby_roads_safety():
    # Get parameters - only need center point
    center_lat = float(request.args.get('center_lat'))
    center_lng = float(request.args.get('center_lng'))
    search_radius_m = int(request.args.get('search_radius_m', 500))  # Search area for roads
    safety_radius_m = int(request.args.get('safety_radius_m', 200))  # Radius for safety features
    
    # Calculate bbox for searching roads
    south, west, north, east = calculate_bbox(center_lat, center_lng, search_radius_m)
    
    print(f"Fetching roads for center ({center_lat}, {center_lng}) with search_radius={search_radius_m}m, safety_radius={safety_radius_m}m")
    
    # Query Overpass API for roads with retry logic
    max_retries = 3
    retry_delay = 2
    result = None
    
    for attempt in range(max_retries):
        try:
            query = f"""
            [out:json][timeout:25];
            (
              way["highway"]["highway"!~"motorway|motorway_link|trunk|trunk_link"]({south},{west},{north},{east});
            );
            out body;
            >;
            out skel qt;
            """
            print(f"Querying Overpass API (attempt {attempt + 1}/{max_retries})...")
            result = overpass_api.query(query)
            print(f"Found {len(result.ways)} road segments")
            break
        except Exception as e:
            error_msg = str(e)
            print(f"Overpass API error (attempt {attempt + 1}/{max_retries}): {error_msg}")
            
            if attempt < max_retries - 1:
                if "load too high" in error_msg.lower() or "rate limit" in error_msg.lower():
                    print(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    return jsonify({"error": f"Overpass API error: {error_msg}"}), 500
            else:
                return jsonify({"error": f"Overpass API error after {max_retries} attempts: {error_msg}"}), 500
    
    if result is None:
        return jsonify({"error": "Failed to query Overpass API"}), 500
    
    # Fetch CCTV, MRT, robbery, streetlight and police data once (with caching)
    print("Fetching safety data from Taipei APIs...")
    try:
        cctv_data = fetch_api_data_cached("d317a3c4-ff08-48af-894e-31dfb5155de3", "CCTV_DATA_CACHE")
        print(f"Loaded {len(cctv_data)} CCTV cameras")
        mrt_data = fetch_api_data_cached("307a7f61-e302-4108-a817-877ccbfca7c1", "MRT_DATA_CACHE")
        print(f"Loaded {len(mrt_data)} MRT exits")
        robbery_data = fetch_api_data_cached("6ecb4c41-fbc9-4b04-b182-a7da6c780f8d", "ROBBERY_DATA_CACHE")
        print(f"Loaded {len(robbery_data)} robbery incidents")
        
        # Pre-filter streetlights to search area to avoid processing 145k items per road
        all_streetlight_data = fetch_streetlight_data()
        print(f"Loaded {len(all_streetlight_data)} streetlights, filtering to search area...")
        streetlight_data = []
        for item in all_streetlight_data:
            try:
                lat = float(item['緯度'])
                lng = float(item['經度'])
                # Pre-filter to search area (with extra margin for safety_radius)
                if south - 0.01 <= lat <= north + 0.01 and west - 0.01 <= lng <= east + 0.01:
                    streetlight_data.append(item)
            except (KeyError, ValueError):
                continue
        print(f"Filtered to {len(streetlight_data)} streetlights in search area")
        
        police_data = load_police_data()
        print(f"Loaded {len(police_data)} police stations")
    except Exception as e:
        print(f"Failed to fetch safety data: {str(e)}")
        return jsonify({"error": f"Failed to fetch safety data: {str(e)}"}), 500
    
    # Process each road segment
    road_segments = []
    total_cctv = 0
    total_metro = 0
    total_robbery = 0
    total_streetlight = 0
    total_police = 0
    
    print(f"Processing {len(result.ways)} road segments...")
    for idx, way in enumerate(result.ways):
        if idx % 100 == 0 and idx > 0:
            print(f"  Processed {idx}/{len(result.ways)} roads...")
        
        # Get road nodes (coordinates)
        nodes = [(float(node.lat), float(node.lon)) for node in way.nodes]
        
        if len(nodes) < 2:
            continue
        
        # Calculate midpoint of the segment
        mid_lat = sum(n[0] for n in nodes) / len(nodes)
        mid_lng = sum(n[1] for n in nodes) / len(nodes)
        
        # Get safety features around this segment
        features = get_safety_features_in_radius(mid_lat, mid_lng, safety_radius_m, cctv_data, mrt_data, robbery_data, streetlight_data, police_data)
        
        # Count by type
        cctv_count = sum(1 for f in features if f['type'] == 'cctv')
        metro_count = sum(1 for f in features if f['type'] == 'metro')
        robbery_count = sum(1 for f in features if f['type'] == 'robbery_incident')
        streetlight_count = sum(1 for f in features if f['type'] == 'streetlight')
        police_count = sum(1 for f in features if f['type'] == 'police')
        
        # Calculate segment safety score using normalized algorithm
        segment_score = calculate_safety_score(
            cctv_count=cctv_count,
            lamp_count=streetlight_count,
            mrt_count=metro_count,
            police_count=police_count,
            theft_count=0,  # No theft data in this endpoint
            robbery_count=robbery_count,
            store_count=0  # TODO: Add convenience store data
        )
        
        road_segments.append({
            'road_name': way.tags.get('name', 'Unknown Road'),
            'road_type': way.tags.get('highway', 'unknown'),
            'nodes': nodes,
            'center': {'lat': mid_lat, 'lng': mid_lng},
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
    
    # Calculate overall area safety score using normalized algorithm
    overall_score = calculate_safety_score(
        cctv_count=total_cctv,
        lamp_count=total_streetlight,
        mrt_count=total_metro,
        police_count=total_police,
        theft_count=0,  # No theft data in this endpoint
        robbery_count=total_robbery,
        store_count=0  # TODO: Add convenience store data
    )
    
    # Determine level and label based on score
    if overall_score >= 60:
        level = 3
        label = "安全"
    elif overall_score >= 40:
        level = 2
        label = "需注意"
    else:
        level = 1
        label = "危險"
    
    # Add level and label to each road segment
    for segment in road_segments:
        score = segment['safety_score']
        if score >= 60:
            segment['level'] = 3
            segment['label'] = "安全"
        elif score >= 40:
            segment['level'] = 2
            segment['label'] = "需注意"
        else:
            segment['level'] = 1
            segment['label'] = "危險"
    
    # Construct response
    response_data = {
        'center': {'lat': center_lat, 'lng': center_lng},
        'search_radius_m': search_radius_m,
        'safety_radius_m': safety_radius_m,
        'summary': {
            'total_roads': len(road_segments),
            'total_cctv': total_cctv,
            'total_metro': total_metro,
            'total_robbery': total_robbery,
            'total_streetlight': total_streetlight,
            'total_police': total_police,
            'overall_score': overall_score,
            'level': level,
            'label': label
        },
        'roads': road_segments
    }
    
    return jsonify(response_data)

# API endpoint to calculate route safety score (between two points)
# ⚠️ DEPRECATED: This version queries too many roads from Overpass API
# Use /get_route_safety_optimized instead
@app.route('/get_route_safety_old', methods=['GET'])
def get_route_safety_old():
    # Get parameters
    start_lat = float(request.args.get('start_lat'))
    start_lng = float(request.args.get('start_lng'))
    end_lat = float(request.args.get('end_lat'))
    end_lng = float(request.args.get('end_lng'))
    radius_m = int(request.args.get('radius_m', 200))
    
    # Calculate bbox for the route area
    min_lat = min(start_lat, end_lat)
    max_lat = max(start_lat, end_lat)
    min_lng = min(start_lng, end_lng)
    max_lng = max(start_lng, end_lng)
    
    # Expand bbox by radius
    lat_offset = (radius_m / 6371000) * (180 / math.pi)
    lng_offset = (radius_m / 6371000) * (180 / math.pi) / math.cos(math.radians((start_lat + end_lat) / 2))
    
    south = min_lat - lat_offset
    north = max_lat + lat_offset
    west = min_lng - lng_offset
    east = max_lng + lng_offset
    
    # Query Overpass API for roads with retry logic
    max_retries = 3
    retry_delay = 2
    result = None
    
    for attempt in range(max_retries):
        try:
            query = f"""
            [out:json][timeout:25];
            (
              way["highway"]["highway"!~"motorway|motorway_link|trunk|trunk_link"]({south},{west},{north},{east});
            );
            out body;
            >;
            out skel qt;
            """
            print(f"Querying Overpass API for route (attempt {attempt + 1}/{max_retries})...")
            result = overpass_api.query(query)
            print(f"Found {len(result.ways)} road segments for route")
            break
        except Exception as e:
            error_msg = str(e)
            print(f"Overpass API error (attempt {attempt + 1}/{max_retries}): {error_msg}")
            
            if attempt < max_retries - 1:
                if "load too high" in error_msg.lower() or "rate limit" in error_msg.lower():
                    print(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    return jsonify({"error": f"Overpass API error: {error_msg}"}), 500
            else:
                return jsonify({"error": f"Overpass API error after {max_retries} attempts: {error_msg}"}), 500
    
    if result is None:
        return jsonify({"error": "Failed to query Overpass API"}), 500
    
    # Fetch CCTV, MRT, robbery, streetlight and police data once (with caching)
    try:
        cctv_data = fetch_api_data_cached("d317a3c4-ff08-48af-894e-31dfb5155de3", "CCTV_DATA_CACHE")
        mrt_data = fetch_api_data_cached("307a7f61-e302-4108-a817-877ccbfca7c1", "MRT_DATA_CACHE")
        robbery_data = fetch_api_data_cached("6ecb4c41-fbc9-4b04-b182-a7da6c780f8d", "ROBBERY_DATA_CACHE")
        streetlight_data = fetch_streetlight_data()
        police_data = load_police_data()
    except Exception as e:
        return jsonify({"error": f"Failed to fetch safety data: {str(e)}"}), 500
    
    # Process each road segment
    road_segments = []
    total_cctv = 0
    total_metro = 0
    total_robbery = 0
    total_streetlight = 0
    total_police = 0
    
    for way in result.ways:
        # Get road nodes (coordinates)
        nodes = [(float(node.lat), float(node.lon)) for node in way.nodes]
        
        if len(nodes) < 2:
            continue
        
        # Calculate midpoint of the segment
        mid_lat = sum(n[0] for n in nodes) / len(nodes)
        mid_lng = sum(n[1] for n in nodes) / len(nodes)
        
        # Get safety features around this segment
        features = get_safety_features_in_radius(mid_lat, mid_lng, radius_m, cctv_data, mrt_data, robbery_data, streetlight_data, police_data)
        
        # Count by type
        cctv_count = sum(1 for f in features if f['type'] == 'cctv')
        metro_count = sum(1 for f in features if f['type'] == 'metro')
        robbery_count = sum(1 for f in features if f['type'] == 'robbery_incident')
        streetlight_count = sum(1 for f in features if f['type'] == 'streetlight')
        police_count = sum(1 for f in features if f['type'] == 'police')
        
        # Calculate segment safety score using normalized algorithm
        segment_score = calculate_safety_score(
            cctv_count=cctv_count,
            lamp_count=streetlight_count,
            mrt_count=metro_count,
            police_count=police_count,
            theft_count=0,  # No theft data in this endpoint
            robbery_count=robbery_count,
            store_count=0  # TODO: Add convenience store data
        )
        
        road_segments.append({
            'road_name': way.tags.get('name', 'Unknown Road'),
            'road_type': way.tags.get('highway', 'unknown'),
            'nodes': nodes,
            'center': {'lat': mid_lat, 'lng': mid_lng},
            'cctv_count': cctv_count,
            'metro_count': metro_count,
            'robbery_count': robbery_count,
            'streetlight_count': streetlight_count,
            'police_count': police_count,
            'safety_score': segment_score,
            'features': features
        })
        
        total_cctv += cctv_count
        total_metro += metro_count
        total_robbery += robbery_count
        total_streetlight += streetlight_count
        total_police += police_count
    
    # Calculate overall route safety score using normalized algorithm
    overall_score = calculate_safety_score(
        cctv_count=total_cctv,
        lamp_count=total_streetlight,
        mrt_count=total_metro,
        police_count=total_police,
        theft_count=0,  # No theft data in this endpoint
        robbery_count=total_robbery,
        store_count=0  # TODO: Add convenience store data
    )
    
    # Construct response
    response_data = {
        'route': {
            'start': {'lat': start_lat, 'lng': start_lng},
            'end': {'lat': end_lat, 'lng': end_lng},
            'radius_m': radius_m
        },
        'summary': {
            'total_segments': len(road_segments),
            'total_cctv': total_cctv,
            'total_metro': total_metro,
            'total_robbery': total_robbery,
            'total_streetlight': total_streetlight,
            'total_police': total_police,
            'overall_score': overall_score
        },
        'segments': road_segments
    }
    
    return jsonify(response_data)

# API endpoint to calculate route safety score (optimized version)

# API endpoint to find and compare multiple routes with safety scores
@app.route('/find_safe_routes', methods=['POST'])
def find_safe_routes():
    """
    找出多條路徑並比較安全性
    回傳最安全的路徑以及替代路徑
    """
    data = request.get_json()
    
    start_lat = data.get('start_lat')
    start_lng = data.get('start_lng')
    end_lat = data.get('end_lat')
    end_lng = data.get('end_lng')
    radius_m = data.get('radius_m', 200)
    
    if not all([start_lat, start_lng, end_lat, end_lng]):
        return jsonify({"error": "Missing coordinates"}), 400
    
    print(f"🔍 Finding safe routes from ({start_lat}, {start_lng}) to ({end_lat}, {end_lng})")
    
    try:
        # 使用 OSRM 獲取多條替代路徑
        osrm_url = f"https://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}"
        params = {
            'overview': 'full',
            'geometries': 'geojson',
            'alternatives': 'true',  # 請求替代路徑
            'steps': 'false'
        }
        
        print("📍 Requesting routes from OSRM...")
        osrm_response = requests.get(osrm_url, params=params, timeout=10)
        
        if osrm_response.status_code != 200:
            return jsonify({"error": "Failed to get routes from OSRM"}), 500
        
        osrm_data = osrm_response.json()
        
        if 'routes' not in osrm_data or len(osrm_data['routes']) == 0:
            return jsonify({"error": "No routes found"}), 404
        
        routes = osrm_data['routes']
        print(f"✅ Found {len(routes)} route(s)")
        
        # 載入安全資料（使用快取）
        print("🔍 Loading safety data...")
        cctv_data = fetch_api_data_cached("d317a3c4-ff08-48af-894e-31dfb5155de3", "CCTV_DATA_CACHE")
        mrt_data = fetch_api_data_cached("307a7f61-e302-4108-a817-877ccbfca7c1", "MRT_DATA_CACHE")
        robbery_data = fetch_api_data_cached("6ecb4c41-fbc9-4b04-b182-a7da6c780f8d", "ROBBERY_DATA_CACHE")
        
        # 預先過濾路燈資料
        all_streetlight_data = fetch_streetlight_data()
        
        # 計算所有路徑的邊界
        all_lats = []
        all_lngs = []
        for route in routes:
            coords = route['geometry']['coordinates']
            all_lats.extend([c[1] for c in coords])
            all_lngs.extend([c[0] for c in coords])
        
        min_lat, max_lat = min(all_lats), max(all_lats)
        min_lng, max_lng = min(all_lngs), max(all_lngs)
        margin = (radius_m / 111000)
        
        streetlight_data = [
            item for item in all_streetlight_data
            if (min_lat - margin <= float(item['緯度']) <= max_lat + margin and
                min_lng - margin <= float(item['經度']) <= max_lng + margin)
        ]
        
        police_data = load_police_data()
        print(f"✅ Safety data loaded")
        
        # 分析每條路徑
        analyzed_routes = []
        
        for idx, route in enumerate(routes):
            print(f"\n📊 Analyzing route {idx + 1}/{len(routes)}...")
            
            # 轉換座標格式
            coordinates = [[coord[1], coord[0]] for coord in route['geometry']['coordinates']]
            
            # 取樣點
            if len(coordinates) <= 20:
                sample_interval = 1
            elif len(coordinates) <= 50:
                sample_interval = 2
            else:
                sample_interval = max(2, len(coordinates) // 25)
            
            sample_points = coordinates[::sample_interval]
            if coordinates[-1] not in sample_points:
                sample_points.append(coordinates[-1])
            
            # 分析每個取樣點
            segments = []
            total_cctv = 0
            total_metro = 0
            total_robbery = 0
            total_streetlight = 0
            total_police = 0
            
            for i, coord in enumerate(sample_points):
                lat, lng = coord
                
                features = get_safety_features_in_radius(
                    lat, lng, radius_m,
                    cctv_data, mrt_data, robbery_data, streetlight_data, police_data
                )
                
                cctv_count = sum(1 for f in features if f['type'] == 'cctv')
                metro_count = sum(1 for f in features if f['type'] == 'metro')
                robbery_count = sum(1 for f in features if f['type'] == 'robbery_incident')
                streetlight_count = sum(1 for f in features if f['type'] == 'streetlight')
                police_count = sum(1 for f in features if f['type'] == 'police')
                
                segment_score = calculate_safety_score(
                    cctv_count=cctv_count,
                    lamp_count=streetlight_count,
                    mrt_count=metro_count,
                    police_count=police_count,
                    theft_count=0,
                    robbery_count=robbery_count,
                    store_count=0
                )
                
                if segment_score >= 60:
                    segment_level = 3
                    segment_label = "安全"
                elif segment_score >= 40:
                    segment_level = 2
                    segment_label = "需注意"
                else:
                    segment_level = 1
                    segment_label = "危險"
                
                segments.append({
                    'segment_index': i,
                    'location': {'lat': lat, 'lng': lng},
                    'cctv_count': cctv_count,
                    'metro_count': metro_count,
                    'robbery_count': robbery_count,
                    'streetlight_count': streetlight_count,
                    'police_count': police_count,
                    'safety_score': segment_score,
                    'level': segment_level,
                    'label': segment_label
                })
                
                total_cctv += cctv_count
                total_metro += metro_count
                total_robbery += robbery_count
                total_streetlight += streetlight_count
                total_police += police_count
            
            # 計算整體安全分數
            overall_score = calculate_safety_score(
                cctv_count=total_cctv,
                lamp_count=total_streetlight,
                mrt_count=total_metro,
                police_count=total_police,
                theft_count=0,
                robbery_count=total_robbery,
                store_count=0
            )
            
            if overall_score >= 60:
                level = 3
                label = "安全"
            elif overall_score >= 40:
                level = 2
                label = "需注意"
            else:
                level = 1
                label = "危險"
            
            analyzed_routes.append({
                'route_index': idx,
                'is_recommended': False,  # 稍後設定
                'geometry': coordinates,
                'distance_m': route['distance'],
                'duration_s': route['duration'],
                'summary': {
                    'total_segments': len(segments),
                    'total_cctv': total_cctv,
                    'total_metro': total_metro,
                    'total_robbery': total_robbery,
                    'total_streetlight': total_streetlight,
                    'total_police': total_police,
                    'overall_score': overall_score,
                    'level': level,
                    'label': label
                },
                'segments': segments
            })
            
            print(f"   ✅ Route {idx + 1}: {label} (score: {overall_score})")
        
        # 找出最安全的路徑
        best_route_idx = max(range(len(analyzed_routes)), 
                            key=lambda i: analyzed_routes[i]['summary']['overall_score'])
        analyzed_routes[best_route_idx]['is_recommended'] = True
        
        print(f"\n🏆 Recommended route: Route {best_route_idx + 1}")
        
        response_data = {
            'start': {'lat': start_lat, 'lng': start_lng},
            'end': {'lat': end_lat, 'lng': end_lng},
            'radius_m': radius_m,
            'total_routes': len(analyzed_routes),
            'recommended_route_index': best_route_idx,
            'routes': analyzed_routes
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

# API endpoint to calculate route safety score (optimized version)
# This version uses OSRM route coordinates directly, no Overpass API needed
@app.route('/get_route_safety', methods=['POST'])
def get_route_safety():
    """
    優化版本：直接使用 OSRM 的路徑座標
    不需要查詢 Overpass API，速度快且穩定
    """
    data = request.get_json()
    
    # 從前端接收 OSRM 的路徑座標
    route_coordinates = data.get('route_coordinates')  # [[lat, lng], [lat, lng], ...]
    radius_m = data.get('radius_m', 200)
    
    if not route_coordinates or len(route_coordinates) < 2:
        return jsonify({"error": "Invalid route coordinates"}), 400
    
    print(f"Analyzing route with {len(route_coordinates)} points")
    
    # Fetch safety data once (with caching)
    try:
        print("Fetching safety data from Taipei APIs...")
        cctv_data = fetch_api_data_cached("d317a3c4-ff08-48af-894e-31dfb5155de3", "CCTV_DATA_CACHE")
        print(f"Loaded {len(cctv_data)} CCTV cameras")
        mrt_data = fetch_api_data_cached("307a7f61-e302-4108-a817-877ccbfca7c1", "MRT_DATA_CACHE")
        print(f"Loaded {len(mrt_data)} MRT exits")
        robbery_data = fetch_api_data_cached("6ecb4c41-fbc9-4b04-b182-a7da6c780f8d", "ROBBERY_DATA_CACHE")
        print(f"Loaded {len(robbery_data)} robbery incidents")
        
        # Pre-filter streetlights to route area
        all_streetlight_data = fetch_streetlight_data()
        print(f"Loaded {len(all_streetlight_data)} streetlights, filtering to route area...")
        
        # Calculate route bounding box
        lats = [coord[0] for coord in route_coordinates]
        lngs = [coord[1] for coord in route_coordinates]
        min_lat, max_lat = min(lats), max(lats)
        min_lng, max_lng = min(lngs), max(lngs)
        
        # Add margin for radius
        margin = (radius_m / 111000)  # Rough conversion to degrees
        streetlight_data = []
        for item in all_streetlight_data:
            try:
                lat = float(item['緯度'])
                lng = float(item['經度'])
                if (min_lat - margin <= lat <= max_lat + margin and 
                    min_lng - margin <= lng <= max_lng + margin):
                    streetlight_data.append(item)
            except (KeyError, ValueError):
                continue
        print(f"Filtered to {len(streetlight_data)} streetlights in route area")
        
        police_data = load_police_data()
        print(f"Loaded {len(police_data)} police stations")
    except Exception as e:
        print(f"Failed to fetch safety data: {str(e)}")
        return jsonify({"error": f"Failed to fetch safety data: {str(e)}"}), 500
    
    # 將路徑分段（取樣以提高效能）
    if len(route_coordinates) <= 20:
        sample_interval = 1  # 短路徑：全部計算
    elif len(route_coordinates) <= 50:
        sample_interval = 2  # 中等路徑：每 2 個點取 1 個
    else:
        sample_interval = max(2, len(route_coordinates) // 25)  # 長路徑：最多 25 個取樣點
    
    sample_points = route_coordinates[::sample_interval]
    
    # 確保終點被包含
    if route_coordinates[-1] not in sample_points:
        sample_points.append(route_coordinates[-1])
    
    print(f"Sampling {len(sample_points)} points from route (interval: {sample_interval})")
    
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
        
        # Determine segment level and label
        if segment_score >= 60:
            segment_level = 3
            segment_label = "安全"
        elif segment_score >= 40:
            segment_level = 2
            segment_label = "需注意"
        else:
            segment_level = 1
            segment_label = "危險"
        
        route_segments.append({
            'segment_index': i,
            'location': {'lat': lat, 'lng': lng},
            'cctv_count': cctv_count,
            'metro_count': metro_count,
            'robbery_count': robbery_count,
            'streetlight_count': streetlight_count,
            'police_count': police_count,
            'safety_score': segment_score,
            'level': segment_level,
            'label': segment_label
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
    
    # Determine level and label
    if overall_score >= 60:
        level = 3
        label = "安全"
    elif overall_score >= 40:
        level = 2
        label = "需注意"
    else:
        level = 1
        label = "危險"
    
    print(f"Route analysis complete: score={overall_score}, level={label}")
    
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
            'overall_score': overall_score,
            'level': level,
            'label': label
        },
        'segments': route_segments
    }
    
    return jsonify(response_data)

if __name__ == '__main__':
    app.run(debug=True, port=5001)
