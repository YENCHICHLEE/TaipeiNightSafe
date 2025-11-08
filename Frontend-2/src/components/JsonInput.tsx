import { useState } from 'react';
import { FileJson, Eye } from 'lucide-react';

interface JsonInputProps {
  onLoadJson: (data: string) => void;
}

const defaultJson = `{
  "meta": {
    "at": "2025-11-08T23:00:00+08:00",
    "center": { "lat": 25.033964, "lng": 121.564468 },
    "radius_m": 200,
    "tz": "Asia/Taipei"
  },
  "summary": {
    "level": 2,
    "label": "需注意",
    "safety_score": 2.1,
    "analysis": {
      "safe_places": 12,
      "warning_zones": 3,
      "lighting_score": 0.8,
      "police_distance_m": 340,
      "last_incident_days": 47
    }
  },
  "places": [
    {
      "safety": 1,
      "type": "store",
      "name": "7-ELEVEN 市府門市",
      "location": { "lat": 25.03452, "lng": 121.56501 },
      "distance_m": 65,
      "open_now": true,
      "phone": "+8862647392323",
      "hours": {
        "tz": "Asia/Taipei",
        "regular": [
          { "dow": "Mon", "open": "09:00", "close": "21:00" },
          { "dow": "Tue", "open": "09:00", "close": "21:00" },
          { "dow": "Wed", "open": "09:00", "close": "21:00" },
          { "dow": "Thu", "open": "09:00", "close": "21:00" },
          { "dow": "Fri", "open": "09:00", "close": "21:00" },
          { "dow": "Sat", "open": "10:00", "close": "18:40" },
          { "dow": "Sun", "open": "10:00", "close": "18:00" }
        ],
        "note": "Regular business hours"
      },
      "signals": ["well_lit", "crowded", "near_main_road", "safe_haven"]
    }
  ]
}`;

export function JsonInput({ onLoadJson }: JsonInputProps) {
  const [jsonText, setJsonText] = useState(defaultJson);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleLoadJson = () => {
    onLoadJson(jsonText);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[1000]">
      {isExpanded && (
        <div className="mb-4 bg-white rounded-lg shadow-2xl p-4 w-96 max-h-96 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <FileJson className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">JSON 資料輸入</h3>
          </div>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="flex-1 w-full p-2 border border-gray-300 rounded-md font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="貼上 JSON 資料..."
          />
          <button
            onClick={handleLoadJson}
            className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            顯示
          </button>
        </div>
      )}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="ml-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-full shadow-lg transition-all flex items-center gap-2"
      >
        <FileJson className="w-5 h-5" />
        {isExpanded ? '關閉' : 'JSON 輸入'}
      </button>
    </div>
  );
}
