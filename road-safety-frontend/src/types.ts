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
