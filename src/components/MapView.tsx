import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import { MarkerData, SafetyPlace } from '../types';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Store, Shield, Camera, Train, Target, Lightbulb, AlertTriangle } from 'lucide-react';
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
}

export function MapView({ markers, safetyPlaces, center, radiusCircle, showCurrentPosition }: MapViewProps) {
  return (
    <MapContainer
      center={center}
      zoom={15}
      className="h-full w-full rounded-lg shadow-lg"
    >
      <MapUpdater center={center} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {showCurrentPosition && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <img
            src="/截圖 2025-11-08 16.31.37.png"
            alt="當前位置"
            style={{
              width: '120px',
              height: '120px',
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

      {safetyPlaces.map((place, index) => (
        <Marker
          key={`place-${index}`}
          position={[place.location.lat, place.location.lng]}
          icon={createCustomIcon(place.type, place.safety)}
        >
          <Popup>
            <div className="text-sm min-w-[200px]">
              <p className="font-semibold text-base mb-2">{place.name}</p>
              <div className="space-y-1">
                <p className="text-gray-600">
                  類型: {
                    place.type === 'store' ? '商店' :
                    place.type === 'police' ? '警局' :
                    place.type === 'cctv' ? '監視器' :
                    place.type === 'metro' ? '捷運站' :
                    place.type === 'streetlight' ? '路燈' :
                    place.type === 'robbery_incident' ? '犯罪事件' :
                    place.type
                  }
                </p>
                <p className="text-gray-600">距離: {place.distance_m}m</p>
                {place.type === 'robbery_incident' && (
                  <>
                    {place.incident_date && (
                      <p className="text-red-600 font-medium">事件日期: {place.incident_date}</p>
                    )}
                    {place.incident_time && (
                      <p className="text-red-600">事件時間: {place.incident_time}</p>
                    )}
                    {place.location_desc && (
                      <p className="text-gray-600">地點: {place.location_desc}</p>
                    )}
                  </>
                )}
                {place.open_now !== undefined && (
                  <p className={`font-medium ${place.open_now ? 'text-green-600' : 'text-red-600'}`}>
                    {place.open_now ? '✓ 營業中' : '✗ 已打烊'}
                  </p>
                )}
                {place.phone && place.phone !== '' && (
                  <p className="text-gray-600">電話: {place.phone}</p>
                )}
                {place.signals && place.signals.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {place.signals.map((signal, i) => (
                      <span
                        key={i}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
