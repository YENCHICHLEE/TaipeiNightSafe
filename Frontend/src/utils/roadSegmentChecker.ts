import { Road } from './roadSafetyDataLoader';

/**
 * 計算兩點之間的距離（公尺）
 * 使用 Haversine 公式
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // 地球半徑（公尺）
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * 計算點到線段的最短距離
 */
function pointToSegmentDistance(
  pointLat: number,
  pointLng: number,
  segmentStart: [number, number],
  segmentEnd: [number, number]
): number {
  const [lat1, lng1] = segmentStart;
  const [lat2, lng2] = segmentEnd;

  // 將經緯度轉換為相對座標（簡化計算）
  const px = pointLng - lng1;
  const py = pointLat - lat1;
  const dx = lng2 - lng1;
  const dy = lat2 - lat1;

  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    // 線段退化為點
    return calculateDistance(pointLat, pointLng, lat1, lng1);
  }

  // 計算投影點在線段上的位置（0-1）
  let t = ((px * dx + py * dy) / lengthSquared);
  t = Math.max(0, Math.min(1, t));

  // 計算投影點的座標
  const projLat = lat1 + t * dy;
  const projLng = lng1 + t * dx;

  return calculateDistance(pointLat, pointLng, projLat, projLng);
}

/**
 * 檢查當前位置是否在任何已知路段的範圍內
 * @param currentLat 當前緯度
 * @param currentLng 當前經度
 * @param roads 已知的路段列表
 * @param threshold 距離閾值（公尺），預設 30 公尺
 * @returns 是否在已知路段範圍內
 */
export function isWithinKnownRoads(
  currentLat: number,
  currentLng: number,
  roads: Road[],
  threshold: number = 30
): boolean {
  if (!roads || roads.length === 0) {
    return false;
  }

  for (const road of roads) {
    if (!road.nodes || road.nodes.length < 2) {
      continue;
    }

    // 檢查每個線段
    for (let i = 0; i < road.nodes.length - 1; i++) {
      const distance = pointToSegmentDistance(
        currentLat,
        currentLng,
        road.nodes[i],
        road.nodes[i + 1]
      );

      if (distance <= threshold) {
        console.log(`📍 在已知路段範圍內: ${road.road_name} (距離: ${distance.toFixed(1)}m)`);
        return true;
      }
    }
  }

  console.log('🚶 已離開已知路段範圍，需要重新載入');
  return false;
}

/**
 * 找出當前位置最近的路段
 */
export function findNearestRoad(
  currentLat: number,
  currentLng: number,
  roads: Road[]
): { road: Road; distance: number } | null {
  if (!roads || roads.length === 0) {
    return null;
  }

  let nearestRoad: Road | null = null;
  let minDistance = Infinity;

  for (const road of roads) {
    if (!road.nodes || road.nodes.length < 2) {
      continue;
    }

    for (let i = 0; i < road.nodes.length - 1; i++) {
      const distance = pointToSegmentDistance(
        currentLat,
        currentLng,
        road.nodes[i],
        road.nodes[i + 1]
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestRoad = road;
      }
    }
  }

  return nearestRoad ? { road: nearestRoad, distance: minDistance } : null;
}
