export interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  label: string;
}

export interface SafetyAPIResponse {
  meta: {
    at: string;
    center: { lat: number; lng: number };
    radius_m: number;
    tz: string;
  };
  summary: {
    level: number;
    label: string;
    safety_score: number;
    analysis: {
      safe_places: number;
      warning_zones: number;
      lighting_score: number;
      police_distance_m: number;
      last_incident_days: number;
    };
  };
  places: SafetyPlace[];
}

export interface SafetyPlace {
  safety: number;
  type: 'store' | 'police' | 'cctv' | 'metro' | 'robbery_incident' | 'streetlight';
  name: string;
  location: { lat: number; lng: number };
  distance_m: number;
  open_now?: boolean;
  phone?: string;
  hours?: {
    tz: string;
    regular: Array<{
      dow: string;
      open: string;
      close: string;
    }>;
    note?: string;
  };
  signals?: string[];
  incident_date?: string;
  incident_time?: string;
  location_desc?: string;
}

export interface NewFormatAPIResponse {
  meta: {
    at: string;
    center: { lat: number; lng: number };
    radius_m: number;
    tz: string;
  };
  summary: {
    safety_score: number;
    analysis: {
      cctv_count: number;
      metro_count: number;
      robbery_count: number;
      streetlight_count: number;
      police_count: number;
    };
  };
  resources: {
    cctv: SafetyPlace[];
    metro: SafetyPlace[];
    criminal: SafetyPlace[];
    streetlight: SafetyPlace[];
    police: SafetyPlace[];
  };
}

// 區域安全相關類型
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

export interface RoadSafetyResponse {
  roads: Road[];
  summary: RoadSafetySummary;
}

// 路徑規劃相關型別
export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteSegment {
  segment_index: number;
  location: { lat: number; lng: number };
  cctv_count: number;
  metro_count: number;
  robbery_count: number;
  streetlight_count: number;
  police_count: number;
  safety_score: number;
  level: number;
  label: string;
}

export interface AnalyzedRoute {
  route_index: number;
  is_recommended: boolean;
  geometry: [number, number][];
  distance_m: number;
  duration_s: number;
  summary: {
    total_segments: number;
    total_cctv: number;
    total_metro: number;
    total_robbery: number;
    total_streetlight: number;
    total_police: number;
    overall_score: number;
    level: number;
    label: string;
  };
  segments: RouteSegment[];
}
