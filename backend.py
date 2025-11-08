from flask import Flask, jsonify, request
import requests
import math
from datetime import datetime

app = Flask(__name__)

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

# API endpoint to fetch CCTV data and transform it
@app.route('/get_safety_data', methods=['GET'])
def get_safety_data():
    # Get parameters from query string
    at = request.args.get('at', '2025-11-08T23:00:00+08:00')  # Default to example
    center_lat = float(request.args.get('center_lat', 25.033964))
    center_lng = float(request.args.get('center_lng', 121.564468))
    radius_m = int(request.args.get('radius_m', 200))
    tz = request.args.get('tz', 'Asia/Taipei')

    # Fetch data from the API
    api_url = "https://data.taipei/api/v1/dataset/d317a3c4-ff08-48af-894e-31dfb5155de3?scope=resourceAquire"
    params = {
        "resource_id": "d317a3c4-ff08-48af-894e-31dfb5155de3",
        "limit": 1000,  # Max limit
        "offset": 0
    }
    response = requests.get(api_url, params=params)
    if response.status_code != 200:
        return jsonify({"error": "Failed to fetch API data"}), 500
    
    data = response.json()
    results = data.get('result', {}).get('results', [])

    # Filter places within radius and transform
    places = []
    for item in results:
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
                    "open_now": True,  # Assuming always open
                    "phone": "",
                    "hours": {
                        "tz": "Asia/Taipei",
                        "regular": [
                            {"dow": "Mon", "open": "00:00", "close": "24:00"},
                            {"dow": "Tue", "open": "00:00", "close": "24:00"},
                            {"dow": "Wed", "open": "00:00", "close": "24:00"},
                            {"dow": "Thu", "open": "00:00", "close": "24:00"},
                            {"dow": "Fri", "open": "00:00", "close": "24:00"},
                            {"dow": "Sat", "open": "00:00", "close": "24:00"},
                            {"dow": "Sun", "open": "00:00", "close": "24:00"}
                        ],
                        "note": "24/7"
                    },
                    "signals": ["well_lit", "crowded", "near_main_road", "safe_haven"]
                })
        except (KeyError, ValueError):
            continue  # Skip invalid entries

    # Sort places by distance
    places.sort(key=lambda x: x['distance_m'])

    # Hardcoded summary values (adjust logic as needed)
    safe_places = len(places)
    warning_zones = 3 if safe_places < 5 else 0  # Example logic
    lighting_score = 0.8
    police_distance_m = 340  # Hardcoded, or calculate if data available
    last_incident_days = 47  # Hardcoded
    safety_score = 2.1 if safe_places > 0 else 1.0  # Example
    level = 2
    label = "需注意"

    # Construct response
    response_data = {
        "meta": {
            "at": at,
            "center": {"lat": center_lat, "lng": center_lng},
            "radius_m": radius_m,
            "tz": tz
        },
        "summary": {
            "level": level,
            "label": label,
            "safety_score": safety_score,
            "analysis": {
                "safe_places": safe_places,
                "warning_zones": warning_zones,
                "lighting_score": lighting_score,
                "police_distance_m": police_distance_m,
                "last_incident_days": last_incident_days
            }
        },
        "places": places
    }

    return jsonify(response_data)

if __name__ == '__main__':
    app.run(debug=True)