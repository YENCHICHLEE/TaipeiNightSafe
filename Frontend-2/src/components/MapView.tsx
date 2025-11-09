import { MapContainer, TileLayer, Marker, Circle, Popup, useMap, Polyline } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import { MarkerData, SafetyPlace, Road } from '../types';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Store, Shield, Camera, Train, Target, Lightbulb, AlertTriangle, Phone, MapPin } from 'lucide-react';
import { renderToString } from 'react-dom/server';
import { useEffect } from 'react';

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

const createCustomIcon = (type: string, safety: number) => {
  let IconComponent;
  let bgColor;

  switch (type) {
    case 'store':
      IconComponent = Store;
      break;
    case 'police':
      IconComponent = Shield;
      break;
    case 'cctv':
      IconComponent = Camera;
      break;
    case 'metro':
      IconComponent = Train;
      break;
    case 'streetlight':
      IconComponent = Lightbulb;
      break;
    case 'robbery_incident':
      IconComponent = AlertTriangle;
      break;
    default:
      IconComponent = Store;
  }

  if (safety === 1) {
    bgColor = '#3CCF4E';
  } else if (safety === 2) {
    bgColor = '#FFC107';
  } else if (safety === -1) {
    bgColor = '#DC2626';
  } else {
    bgColor = '#FF5252';
  }

  const iconHtml = renderToString(
    <div
      style={{
        backgroundColor: bgColor,
        borderRadius: '50%',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '3px solid white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      <IconComponent color="white" size={18} />
    </div>
  );

  return L.divIcon({
    html: iconHtml,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

function MapUpdater({ center }: { center: LatLngExpression }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  return null;
}

interface MapViewProps {
  markers: MarkerData[];
  safetyPlaces: SafetyPlace[];
  center: LatLngExpression;
  radiusCircle?: { lat: number; lng: number; radius: number };
  showCurrentPosition?: boolean;
  isMoving?: boolean;
  roads?: Road[];
  showRoads?: boolean;
  movementPath?: [number, number][];
}

const getRoadColor = (score: number): string => {
  if (score >= 60) return '#22c55e';
  if (score >= 40) return '#eab308';
  return '#ef4444';
};

const getLevelColor = (level: number): string => {
  if (level === 3) return '#22c55e';
  if (level === 2) return '#eab308';
  return '#ef4444';
};

export function MapView({ markers, safetyPlaces, center, radiusCircle, showCurrentPosition, isMoving, roads, showRoads, movementPath }: MapViewProps) {
  return (
    <MapContainer
      center={center}
      zoom={15}
      className="h-full w-full rounded-lg shadow-lg"
    >
      <MapUpdater center={center} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        maxZoom={19}
        subdomains="abcd"
      />

      {/* 移動軌跡線條 */}
      {movementPath && movementPath.length > 1 && (
        <Polyline
          positions={movementPath}
          pathOptions={{
            color: '#3b82f6',
            weight: 4,
            opacity: 0.8,
            dashArray: '10, 5',
          }}
        >
          <Popup>
            <div className="min-w-[150px]">
              <h4 className="font-bold text-base mb-2">移動軌跡</h4>
              <p className="text-sm text-gray-600">
                <strong>軌跡點數:</strong> {movementPath.length}
              </p>
              <p className="text-sm text-gray-600">
                <strong>起點:</strong> {movementPath[0][0].toFixed(6)}, {movementPath[0][1].toFixed(6)}
              </p>
              <p className="text-sm text-gray-600">
                <strong>終點:</strong> {movementPath[movementPath.length - 1][0].toFixed(6)}, {movementPath[movementPath.length - 1][1].toFixed(6)}
              </p>
            </div>
          </Popup>
        </Polyline>
      )}

      {/* 道路安全線條 */}
      {showRoads && roads && roads.map((road, index) => (
        <Polyline
          key={`road-${index}`}
          positions={road.nodes}
          pathOptions={{
            color: getRoadColor(road.safety_score),
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

      {showCurrentPosition && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -100%)', // 底部對準經緯度
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <img
            src={isMoving ? '/run.png' : '/people.png'}
            alt="當前位置"
            style={{
              width: '60px',
              height: '60px',
              filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))',
            }}
          />
        </div>
      )}

      {radiusCircle && (
        <>
          <Marker
            position={[radiusCircle.lat, radiusCircle.lng]}
            icon={createCenterIcon()}
          >
            <Popup>
              <div className="text-sm min-w-[180px]">
                <p className="font-semibold text-base mb-2">分析中心點</p>
                <p className="text-gray-600">
                  座標: {radiusCircle.lat.toFixed(6)}, {radiusCircle.lng.toFixed(6)}
                </p>
                <p className="text-gray-600 mt-1">
                  分析範圍: {radiusCircle.radius}m
                </p>
              </div>
            </Popup>
          </Marker>
          <Circle
            center={[radiusCircle.lat, radiusCircle.lng]}
            radius={radiusCircle.radius}
            pathOptions={{
              color: '#6366f1',
              fillColor: '#6366f1',
              fillOpacity: 0.1,
              weight: 2,
              dashArray: '5, 5',
            }}
          />
        </>
      )}

      {markers.map((marker) => (
        <div key={marker.id}>
          <Marker position={[marker.lat, marker.lng]}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{marker.label}</p>
                <p className="text-gray-600">
                  座標: {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}
                </p>
                <p className="text-gray-600">範圍: {marker.radius}m</p>
              </div>
            </Popup>
          </Marker>
          <Circle
            center={[marker.lat, marker.lng]}
            radius={marker.radius}
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.2,
            }}
          />
        </div>
      ))}

      {safetyPlaces.map((place, index) => {
        const formatHours = () => {
          if (place.open_now !== undefined) {
            return place.open_now ? '營業中' : '已打烊';
          }
          if (!place.hours?.regular || place.hours.regular.length === 0) {
            return '營業時間未知';
          }
          const firstSchedule = place.hours.regular[0];
          return `今天 ${firstSchedule.open}-${firstSchedule.close}`;
        };

        return (
          <Marker
            key={`place-${index}`}
            position={[place.location.lat, place.location.lng]}
            icon={createCustomIcon(place.type, place.safety)}
          >
            <Popup maxWidth={350} className="custom-popup">
              <div className="min-w-[280px] p-1">
                <div className="text-lg font-bold mb-2 text-gray-900">
                  {place.name}
                </div>

                {place.phone && place.phone !== '' && (
                  <div className="text-sm text-gray-700 mb-1">
                    {place.phone}
                  </div>
                )}

                <div className="text-sm text-gray-700 mb-3">
                  {formatHours()}
                </div>

                <div className="flex gap-2">
                  {place.phone && place.phone !== '' && (
                    <button
                      onClick={() => window.open(`tel:${place.phone}`, '_blank')}
                      className="flex-1 flex items-center justify-center gap-1 py-2 px-3 bg-white border-2 border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                      title="撥打電話"
                    >
                      <Phone size={18} className="text-gray-700" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}`;
                      window.open(googleMapsUrl, '_blank');
                    }}
                    className="flex-1 flex items-center justify-center gap-1 py-2 px-3 bg-white border-2 border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                    title="在地圖中查看"
                  >
                    <MapPin size={18} className="text-gray-700" />
                  </button>

                  <button
                    onClick={() => {
                      const searchQuery = encodeURIComponent(place.name);
                      const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}`;
                      window.open(googleSearchUrl, '_blank');
                    }}
                    className="flex-1 flex items-center justify-center gap-1 py-2 px-3 bg-white border-2 border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                    title="Google 搜尋"
                  >
                    <span className="text-gray-700 font-bold text-lg">G</span>
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
