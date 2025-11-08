export interface Road {
  road_name: string;
  road_type: string;
  safety_score: number;
  level: number;
  label: string;
  cctv_count: number;
  metro_count: number;
  nodes: [number, number][];
}

export interface RoadSafetySummary {
  overall_score: number;
  level: number;
  label: string;
  total_roads: number;
  total_cctv: number;
  total_metro: number;
}

export interface RoadSafetyData {
  roads: Road[];
  summary: RoadSafetySummary;
}

/**
 * 載入指定座標的道路安全資料
 */
export const loadRoadSafetyData = async (
  lat: number,
  lng: number,
  searchRadius: number = 100,
  safetyRadius: number = 50
): Promise<RoadSafetyData> => {
  const params = new URLSearchParams({
    center_lat: String(lat),
    center_lng: String(lng),
    search_radius_m: String(searchRadius),
    safety_radius_m: String(safetyRadius),
  });

  const url = `http://127.0.0.1:5001/get_nearby_roads_safety?${params.toString()}`;
  console.log('🌐 呼叫道路安全 API:', url);

  const response = await fetch(url);

  if (!response.ok) {
    console.error('❌ API 回應錯誤:', response.status, response.statusText);
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log('📦 道路安全資料:', data);

  return data;
};
