import { Trash2, MapPin } from 'lucide-react';
import { MarkerData } from '../types';

interface MarkerListProps {
  markers: MarkerData[];
  onDeleteMarker: (id: string) => void;
}

export function MarkerList({ markers, onDeleteMarker }: MarkerListProps) {
  if (markers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">標記列表</h2>
        <p className="text-gray-500 text-center py-8">尚無標記</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        標記列表 ({markers.length})
      </h2>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {markers.map((marker) => (
          <div
            key={marker.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <MapPin className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">
                    {marker.label}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    範圍: {marker.radius}m
                  </p>
                </div>
              </div>
              <button
                onClick={() => onDeleteMarker(marker.id)}
                className="text-red-500 hover:text-red-700 transition-colors p-1"
                title="刪除標記"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
