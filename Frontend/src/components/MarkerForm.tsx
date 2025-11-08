import { useState } from 'react';
import { MapPin, Plus } from 'lucide-react';

interface MarkerFormProps {
  onAddMarker: (lat: number, lng: number, radius: number, label: string) => void;
}

export function MarkerForm({ onAddMarker }: MarkerFormProps) {
  const [lat, setLat] = useState('25.0330');
  const [lng, setLng] = useState('121.5654');
  const [radius, setRadius] = useState('500');
  const [label, setLabel] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusNum = parseFloat(radius);

    if (isNaN(latNum) || isNaN(lngNum) || isNaN(radiusNum)) {
      alert('請輸入有效的數值');
      return;
    }

    if (!label.trim()) {
      alert('請輸入標籤名稱');
      return;
    }

    onAddMarker(latNum, lngNum, radiusNum, label);
    setLabel('');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">新增地點標記</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            緯度 (Latitude)
          </label>
          <input
            type="text"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="25.0330"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            經度 (Longitude)
          </label>
          <input
            type="text"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="121.5654"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          範圍 (公尺)
        </label>
        <input
          type="text"
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          標籤名稱
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="例如：台北101"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        新增標記
      </button>
    </form>
  );
}
