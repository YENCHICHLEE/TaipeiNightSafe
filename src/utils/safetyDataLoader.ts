import { SafetyAPIResponse, NewFormatAPIResponse, SafetyPlace } from '../types';

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
 * 從 API 或 mock 取得安全資料
 */
const fetchSafetyData = async (
  lat: number,
  lng: number
): Promise<NewFormatAPIResponse> => {
  try {
    const qs = new URLSearchParams({
      center_lat: String(lat),
      center_lng: String(lng),
    });
    const resp = await fetch(`/mock/get_nearby_roads_safety?${qs.toString()}`);
    if (!resp.ok) throw new Error('API request failed');
    return await resp.json();
  } catch (e) {
    console.warn('API request failed, using mock data', e);
    return getMockSafetyData(lat, lng);
  }
};

/**
 * 產生 mock 安全資料
 */
const getMockSafetyData = (lat: number, lng: number): NewFormatAPIResponse => {
  return {
    meta: {
      at: new Date().toISOString(),
      center: { lat, lng },
      radius_m: 200,
      tz: 'Asia/Taipei',
    },
    summary: {
      safety_score: 45.5,
      analysis: {
        cctv_count: 8,
        metro_count: 2,
        robbery_count: 1,
        streetlight_count: 25,
        police_count: 1,
      },
    },
    resources: {
      cctv: [
        {
          safety: 1,
          type: 'cctv',
          name: 'CAM-12345',
          location: { lat: lat + 0.00056, lng: lng + 0.00054 },
          distance_m: 65,
          phone: '',
        },
      ],
      metro: [
        {
          safety: 1,
          type: 'metro',
          name: '市政府站 1 號出口',
          location: { lat: lat + 0.00002, lng: lng + 0.00065 },
          distance_m: 120,
          phone: '',
        },
      ],
      criminal: [
        {
          safety: -1,
          type: 'robbery_incident',
          name: '搶奪案件 - 2024-10-15',
          location: { lat: lat - 0.00095, lng: lng - 0.00058 },
          distance_m: 180,
          incident_date: '2024-10-15',
          incident_time: '22:00-24:00',
          location_desc: '信義區市府路',
          phone: '',
        },
      ],
      streetlight: [
        {
          safety: 1,
          type: 'streetlight',
          name: 'LIGHT-67890',
          location: { lat: lat + 0.00025, lng: lng + 0.00031 },
          distance_m: 45,
          phone: '',
        },
      ],
      police: [
        {
          safety: 1,
          type: 'police',
          name: '信義分局',
          location: { lat: lat - 0.00107, lng: lng - 0.00213 },
          distance_m: 340,
          phone: '110',
          open_now: true,
        },
      ],
    },
  };
};

/**
 * 將新格式 API 回應轉換為 SafetyAPIResponse
 */
export const convertNewFormatToSafetyResponse = (
  data: NewFormatAPIResponse
): SafetyAPIResponse => {
  const allPlaces: SafetyPlace[] = [
    ...data.resources.cctv,
    ...data.resources.metro,
    ...data.resources.criminal,
    ...data.resources.streetlight,
    ...data.resources.police,
  ];

  return {
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
          data.summary.analysis.cctv_count +
          data.summary.analysis.metro_count +
          data.summary.analysis.police_count,
        warning_zones: data.summary.analysis.robbery_count,
        lighting_score: data.summary.analysis.streetlight_count / 30,
        police_distance_m:
          data.resources.police.length > 0
            ? data.resources.police[0].distance_m
            : 999,
        last_incident_days: 30,
      },
    },
    places: allPlaces,
  };
};
