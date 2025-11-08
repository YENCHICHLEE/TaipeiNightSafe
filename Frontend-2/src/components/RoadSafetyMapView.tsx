import { MapContainer, TileLayer, Polyline, Circle, Popup, Marker } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import { RoadSafetyData } from '../utils/roadSafetyDataLoader';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Target } from 'lucide-react';
import { renderToString } from 'react-dom/server';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createCenterIcon = () => {
  const iconHtml = renderToString(
    <div
      style={{
        backgroundColor: '#6366f1',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '4px solid white',
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.5)',
      }}
    >
      <Target color="white" size={22} strokeWidth={3} />
    </div>
  );

  return L.divIcon({
    html: iconHtml,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

interface RoadSafetyMapViewProps {
  center: LatLngExpression;
  data: RoadSafetyData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const getColor = (score: number): string => {
  if (score >= 60) return '#22c55e';
  if (score >= 40) return '#eab308';
  return '#ef4444';
};

const getLevelColor = (level: number): string => {
  if (level === 3) return '#22c55e'; // 安全
  if (level === 2) return '#eab308'; // 需注意
  return '#ef4444'; // 危險
};

export function RoadSafetyMapView({ center, data, loading, error, onRetry }: RoadSafetyMapViewProps) {
  const safetyRadius = 50;

  return (
    <div className="h-full w-full flex flex-col">
      {/* 載入中 */}
      {loading && (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-teal-500 rounded-full animate-spin"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      )}

      {/* 錯誤訊息 */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-red-600">
          <p>❌ {error}</p>
          {error.includes('load too high') && (
            <p className="text-sm text-yellow-600">💡 Overpass API 伺服器負載過高，請稍後再試</p>
          )}
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
          >
            重試
          </button>
        </div>
      )}

      {/* 摘要資訊 */}
      {data && !loading && (
        <div className="bg-white p-4 shadow-sm flex gap-4 overflow-x-auto">
          <div className="flex-1 min-w-[200px] bg-gray-50 rounded-lg p-3">
            <h3 className="font-semibold text-gray-700 mb-2">區域安全評估</h3>
            <div
              className="inline-block px-3 py-1 rounded-full text-white font-bold mb-2"
              style={{ backgroundColor: getLevelColor(data.summary.level) }}
            >
              {data.summary.label}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-center">
                <div className="text-gray-500">總分數</div>
                <div className="text-xl font-bold">{data.summary.overall_score}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-500">道路數</div>
                <div className="text-xl font-bold">{data.summary.total_roads}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-500">監視器</div>
                <div className="text-xl font-bold">{data.summary.total_cctv}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-500">捷運站</div>
                <div className="text-xl font-bold">{data.summary.total_metro}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 border border-gray-200 min-w-[180px]">
            <h4 className="font-semibold text-gray-700 mb-2 text-sm">圖例</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-8 h-1 rounded" style={{ backgroundColor: '#22c55e' }}></span>
                <span>安全 (≥ 60)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-1 rounded" style={{ backgroundColor: '#eab308' }}></span>
                <span>需注意 (40-59)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-1 rounded" style={{ backgroundColor: '#ef4444' }}></span>
                <span>危險 (&lt; 40)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 地圖 */}
      {!loading && !error && (
        <div className="flex-1">
          <MapContainer center={center} zoom={15} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* 中心點標記 */}
            {data && (
              <>
                <Marker position={center} icon={createCenterIcon()}>
                  <Popup>
                    <div className="text-sm min-w-[180px]">
                      <p className="font-semibold text-base mb-2">搜尋中心</p>
                      <p className="text-gray-600">安全檢測半徑: {safetyRadius}m</p>
                    </div>
                  </Popup>
                </Marker>
                <Circle
                  center={center}
                  radius={safetyRadius}
                  pathOptions={{
                    color: '#3b82f6',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.1,
                    weight: 2,
                    dashArray: '5, 5',
                  }}
                >
                  <Popup>
                    <strong>搜尋中心</strong>
                    <br />
                    安全檢測半徑: {safetyRadius}m
                  </Popup>
                </Circle>
              </>
            )}

            {/* 道路線條 */}
            {data?.roads.map((road, index) => (
              <Polyline
                key={index}
                positions={road.nodes}
                pathOptions={{
                  color: getColor(road.safety_score),
                  weight: 5,
                  opacity: 0.7,
                }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <h4 className="font-bold text-base mb-2">{road.road_name}</h4>
                    <p className="text-sm text-gray-600">
                      <strong>類型:</strong> {road.road_type}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>安全分數:</strong> {road.safety_score}
                    </p>
                    <p className="text-sm">
                      <strong>等級:</strong>{' '}
                      <span style={{ color: getLevelColor(road.level) }}>{road.label}</span>
                    </p>
                    <hr className="my-2" />
                    <p className="text-sm">📹 監視器: {road.cctv_count}</p>
                    <p className="text-sm">🚇 捷運站: {road.metro_count}</p>
                  </div>
                </Popup>
              </Polyline>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
