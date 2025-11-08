import { SafetyAPIResponse, SafetyPlace } from '../types';

type LatLng = { lat: number; lng: number };

/**
 * 處理 Flutter 傳來的定位事件並載入安全資料
 */
export const handleLocationEventAndLoad = async ({
  event,
  mapCenter,
  safetyData,
  setMapCenter,
  setSafetyData,
  setShowMap,
}: {
  event: MessageEvent;
  mapCenter: [number, number];
  safetyData: SafetyAPIResponse | null;
  setMapCenter: (c: [number, number]) => void;
  setSafetyData: (d: SafetyAPIResponse) => void;
  setShowMap: (v: boolean) => void;
}) => {
  const resolveCenter = (override?: LatLng): LatLng => {
    if (override) return override;
    if (safetyData?.meta?.center) return safetyData.meta.center;
    return { lat: mapCenter[0], lng: mapCenter[1] };
  };

  try {
    const parsed = JSON.parse(event.data);
    if (parsed.name !== 'location' || !parsed.data) return;

    const { latitude, longitude } = parsed.data as { latitude: number; longitude: number };
    const center: LatLng = { lat: latitude, lng: longitude };
    setMapCenter([center.lat, center.lng]);
    setShowMap(true);

    if (safetyData) {
      setSafetyData({
        ...safetyData,
        meta: {
          ...safetyData.meta,
          center,
        },
      });
    }

    const raw = await fetchSafetyData(center.lat, center.lng);
    const converted = convertNewFormatToSafetyResponse(raw);

    setSafetyData(converted);
    const finalCenter = resolveCenter(converted.meta.center);
    setMapCenter([finalCenter.lat, finalCenter.lng]);

    window.removeEventListener('message', handleLocationEventAndLoad as any);
  } catch (err) {
    console.error('處理定位事件失敗：', err);
  }
};

/**
 * 載入指定座標的安全資料（新格式）
 */
export const loadSafetyData = async (
  lat: number,
  lng: number
): Promise<SafetyAPIResponse> => {
  const raw = await fetchSafetyData(lat, lng);
  return convertNewFormatToSafetyResponse(raw);
};

/**
 * 從後端 API 取得安全資料
 */
const fetchSafetyData = async (
  lat: number,
  lng: number
): Promise<any> => {
  const qs = new URLSearchParams({
    center_lat: String(lat),
    center_lng: String(lng),
  });
  const url = `http://127.0.0.1:5001/get_safety_data?${qs.toString()}`;
  console.log('🌐 呼叫後端 API:', url);
  
  const resp = await fetch(url);
  
  if (!resp.ok) {
    console.error('❌ API 回應錯誤:', resp.status, resp.statusText);
    throw new Error(`API request failed: ${resp.status} ${resp.statusText}`);
  }
  
  const jsonData = await resp.json();
  console.log('📦 後端原始回傳:', jsonData);
  
  return jsonData;
};

/**
 * 將新格式 API 回應轉換為 SafetyAPIResponse
 */
export const convertNewFormatToSafetyResponse = (
  data: any
): SafetyAPIResponse => {
  console.log('🔍 檢查資料結構:', {
    hasResources: !!data.resources,
    hasMeta: !!data.meta,
    hasSummary: !!data.summary,
    dataKeys: Object.keys(data)
  });

  // 檢查資料結構
  if (!data.resources) {
    console.error('❌ 缺少 resources 欄位，完整資料:', data);
    throw new Error('後端回傳資料缺少 resources 欄位');
  }

  // 只顯示 metro、streetlight 和 police，忽略 cctv 和 criminal
  const allPlaces: SafetyPlace[] = [
    ...(data.resources.metro || []),
    ...(data.resources.streetlight || []),
    ...(data.resources.police || []),
  ];

  console.log('🔄 轉換資料:', {
    metro: data.resources.metro?.length || 0,
    streetlight: data.resources.streetlight?.length || 0,
    police: data.resources.police?.length || 0,
    total: allPlaces.length,
    ignored_cctv: data.resources.cctv?.length || 0,
    ignored_criminal: data.resources.criminal?.length || 0
  });

  const converted = {
    meta: data.meta,
    summary: {
      level:
        data.summary.safety_score >= 70
          ? 1
          : data.summary.safety_score >= 40
          ? 2
          : 3,
      label:
        data.summary.safety_score >= 70
          ? '安全'
          : data.summary.safety_score >= 40
          ? '需注意'
          : '危險',
      safety_score: data.summary.safety_score,
      analysis: {
        safe_places:
          (data.summary.analysis.cctv_count || 0) +
          (data.summary.analysis.metro_count || 0) +
          (data.summary.analysis.police_count || 0),
        warning_zones: data.summary.analysis.robbery_count || 0,
        lighting_score: (data.summary.analysis.streetlight_count || 0) / 30,
        police_distance_m:
          data.resources.police && data.resources.police.length > 0
            ? data.resources.police[0].distance_m
            : 999,
        last_incident_days: 30,
      },
    },
    places: allPlaces,
  };

  console.log('✅ 轉換完成:', {
    safety_score: converted.summary.safety_score,
    label: converted.summary.label,
    places_count: converted.places.length
  });

  return converted;
};
