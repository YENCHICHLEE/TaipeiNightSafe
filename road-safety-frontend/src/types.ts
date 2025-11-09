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

export interface Summary {
  overall_score: number;
  level: number;
  label: string;
  total_roads: number;
  total_cctv: number;
  total_metro: number;
}

export interface RoadSafetyResponse {
  roads: Road[];
  summary: Summary;
}
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

export interface RouteSafetySummary {
  total_segments: number;
  total_cctv: number;
  total_metro: number;
  total_robbery: number;
  total_streetlight: number;
  total_police: number;
  overall_score: number;
  level: number;
  label: string;
}

export interface RouteSafetyResponse {
  route: {
    total_points: number;
    sampled_points: number;
    radius_m: number;
  };
  summary: RouteSafetySummary;
  segments: RouteSegment[];
}
