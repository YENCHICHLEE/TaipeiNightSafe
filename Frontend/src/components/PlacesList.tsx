import { Store, Shield, Camera, Train, MapPin, Lightbulb, AlertTriangle } from 'lucide-react';
import { SafetyPlace } from '../types';

interface PlacesListProps {
  places: SafetyPlace[];
}

const getPlaceIcon = (type: string) => {
  switch (type) {
    case 'store':
      return Store;
    case 'police':
      return Shield;
    case 'cctv':
      return Camera;
    case 'metro':
      return Train;
    case 'streetlight':
      return Lightbulb;
    case 'robbery_incident':
      return AlertTriangle;
    default:
      return MapPin;
  }
};

const getPlaceTypeLabel = (type: string) => {
  switch (type) {
    case 'store':
      return '商店';
    case 'police':
      return '警局';
    case 'cctv':
      return '監視器';
    case 'metro':
      return '捷運站';
    case 'streetlight':
      return '路燈';
    case 'robbery_incident':
      return '犯罪事件';
    default:
      return type;
  }
};

const getSafetyColor = (safety: number) => {
  if (safety === 1) return 'text-emerald-600';
  if (safety === 2) return 'text-amber-600';
  if (safety === -1) return 'text-red-700';
  return 'text-rose-600';
};

const getSafetyBgColor = (safety: number) => {
  if (safety === 1) return 'bg-emerald-50 border-emerald-200';
  if (safety === 2) return 'bg-amber-50 border-amber-200';
  if (safety === -1) return 'bg-red-50 border-red-300';
  return 'bg-rose-50 border-rose-200';
};

export function PlacesList({ places }: PlacesListProps) {
  if (places.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-3 px-1">
        安全地點 ({places.length})
      </h2>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {places.map((place, index) => {
          const Icon = getPlaceIcon(place.type);
          return (
            <div
              key={index}
              className={`${getSafetyBgColor(place.safety)} border rounded-xl p-3 sm:p-4`}
            >
              <div className="flex items-start gap-3">
                <div className={`${getSafetyColor(place.safety)} mt-0.5 flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-semibold text-gray-800 text-sm sm:text-base">{place.name}</p>
                    {place.open_now !== undefined && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${place.open_now ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        {place.open_now ? '營業中' : '已打烊'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                    <span className="bg-white px-2 py-0.5 rounded-md">{getPlaceTypeLabel(place.type)}</span>
                    <span>•</span>
                    <span>{place.distance_m}m</span>
                  </div>

                  {place.type === 'robbery_incident' && (
                    <div className="mb-2 space-y-1">
                      {place.incident_date && (
                        <p className="text-xs text-red-600 font-medium">
                          事件日期: {place.incident_date}
                        </p>
                      )}
                      {place.incident_time && (
                        <p className="text-xs text-red-600">
                          事件時間: {place.incident_time}
                        </p>
                      )}
                      {place.location_desc && (
                        <p className="text-xs text-gray-600">
                          地點: {place.location_desc}
                        </p>
                      )}
                    </div>
                  )}

                  {place.phone && place.phone !== '' && (
                    <p className="text-xs text-gray-600 mb-2">
                      電話: {place.phone}
                    </p>
                  )}

                  {place.signals && place.signals.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {place.signals.map((signal, i) => (
                        <span
                          key={i}
                          className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium"
                        >
                          {signal}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
