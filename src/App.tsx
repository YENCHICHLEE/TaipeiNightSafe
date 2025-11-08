import { useState, useEffect } from 'react';
import { MapView } from './components/MapView';
import { MarkerForm } from './components/MarkerForm';
import { MarkerList } from './components/MarkerList';
import { JsonInput } from './components/JsonInput';
import { SafetySummary } from './components/SafetySummary';
import { SafetyIndicator } from './components/SafetyIndicator';
import { PlacesList } from './components/PlacesList';
import { MarkerData, SafetyAPIResponse } from './types';

function App() {
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([25.0330, 121.5654]);
  const [safetyData, setSafetyData] = useState<SafetyAPIResponse | null>(null);
  const [showCurrentPosition, setShowCurrentPosition] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const response = JSON.parse(event.data);
        if (response.name === 'location' && response.data) {
          const { latitude, longitude } = response.data;
          setMapCenter([latitude, longitude]);
        }
      } catch (error) {
        console.error('解析位置失敗:', error);
      }
    };

    window.addEventListener('message', handleMessage);

    if ((window as any).flutterObject) {
      (window as any).flutterObject.postMessage(JSON.stringify({
        name: 'location',
        data: null
      }));
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleAddMarker = (lat: number, lng: number, radius: number, label: string) => {
    const newMarker: MarkerData = {
      id: `${Date.now()}-${Math.random()}`,
      lat,
      lng,
      radius,
      label,
    };
    setMarkers([...markers, newMarker]);
    setMapCenter([lat, lng]);
  };

  const handleDeleteMarker = (id: string) => {
    setMarkers(markers.filter((marker) => marker.id !== id));
  };

  const handleLoadJson = (jsonText: string) => {
    try {
      const data: SafetyAPIResponse = JSON.parse(jsonText);
      setSafetyData(data);
      setMapCenter([data.meta.center.lat, data.meta.center.lng]);
    } catch (error) {
      alert('JSON 格式錯誤，請檢查輸入的資料');
      console.error('JSON parse error:', error);
    }
  };

  const handleUpdateCenter = () => {
    if (safetyData) {
      setMapCenter([safetyData.meta.center.lat, safetyData.meta.center.lng]);
    }
  };

  const handleSetLocation = async () => {
    const input = prompt('請輸入座標 (格式: 25.033, 121.565) 或地址:');
    if (!input) return;

    const coordPattern = /^(-?\d+\.?\d*)\s*,?\s*(-?\d+\.?\d*)$/;
    const match = input.trim().match(coordPattern);

    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setMapCenter([lat, lng]);
      } else {
        alert('座標超出有效範圍');
      }
    } else {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&limit=1`
        );
        const data = await response.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          setMapCenter([lat, lng]);
        } else {
          alert('找不到該地址，請重新輸入');
        }
      } catch (error) {
        alert('地址查詢失敗，請檢查網路連線');
        console.error('Geocoding error:', error);
      }
    }
  };

  const handleGetCurrentPosition = () => {
    setShowCurrentPosition(true);
    setTimeout(() => {
      setShowCurrentPosition(false);
    }, 3000);
  };

  const handleNotifyFlutter = () => {
    const message = {
      name: 'mapCenter',
      data: {
        latitude: mapCenter[0],
        longitude: mapCenter[1]
      }
    };

    if ((window as any).flutterObject) {
      (window as any).flutterObject.postMessage(JSON.stringify(message));
      alert('已通知 Flutter');
    } else {
      alert('Flutter 環境未偵測到');
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <header className="bg-gradient-to-r from-teal-500 to-teal-600 p-4 sm:p-5 flex-shrink-0 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          夜歸安全地圖
        </h1>
        <p className="text-teal-50 text-xs sm:text-sm mt-1">為您的安全把關</p>
      </header>

      <SafetyIndicator data={safetyData} />

      <div className="flex-1 flex flex-col overflow-hidden pb-16">
        <div className="flex-1 p-2 sm:p-3">
          <MapView
            markers={markers}
            safetyPlaces={safetyData?.places || []}
            center={mapCenter}
            radiusCircle={
              safetyData
                ? {
                    lat: safetyData.meta.center.lat,
                    lng: safetyData.meta.center.lng,
                    radius: safetyData.meta.radius_m,
                  }
                : undefined
            }
            showCurrentPosition={showCurrentPosition}
          />
        </div>

        {safetyData && (
          <div className="bg-white border-t border-gray-200 p-3 sm:p-4 overflow-y-auto max-h-[35vh] flex-shrink-0">
            <div className="mb-3">
              <SafetySummary data={safetyData} onUpdateCenter={handleUpdateCenter} />
            </div>
            <PlacesList places={safetyData.places} />
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-3 sm:p-4 flex gap-2 sm:gap-3 z-[900]">
        <button
          onClick={() => {
            const jsonInput = document.createElement('textarea');
            jsonInput.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:90%;max-width:500px;height:60vh;z-index:9999;padding:1rem;border:2px solid #14b8a6;border-radius:12px;font-family:monospace;font-size:12px;background:white;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);';
            jsonInput.placeholder = '貼上 JSON 資料...';
            jsonInput.value = JSON.stringify({
              meta: { at: "2025-11-08T23:00:00+08:00", center: { lat: 25.033964, lng: 121.564468 }, radius_m: 200, tz: "Asia/Taipei" },
              summary: { level: 2, label: "需注意", safety_score: 2.1, analysis: { safe_places: 12, warning_zones: 3, lighting_score: 0.8, police_distance_m: 340, last_incident_days: 47 } },
              places: [{ safety: 1, type: "store", name: "7-ELEVEN 市府門市", location: { lat: 25.03452, lng: 121.56501 }, distance_m: 65, open_now: true, phone: "+8862647392323", signals: ["well_lit", "crowded", "near_main_road", "safe_haven"] }]
            }, null, 2);

            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9998;';

            const btnContainer = document.createElement('div');
            btnContainer.style.cssText = 'position:fixed;bottom:10%;left:50%;transform:translateX(-50%);z-index:10000;display:flex;gap:12px;';

            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = '載入';
            confirmBtn.style.cssText = 'padding:12px 28px;background:#14b8a6;color:white;border:none;border-radius:12px;font-weight:600;box-shadow:0 4px 6px -1px rgba(20,184,166,0.3);';
            confirmBtn.onclick = () => {
              handleLoadJson(jsonInput.value);
              document.body.removeChild(jsonInput);
              document.body.removeChild(overlay);
              document.body.removeChild(btnContainer);
            };

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '取消';
            cancelBtn.style.cssText = 'padding:12px 28px;background:#f3f4f6;color:#374151;border:none;border-radius:12px;font-weight:600;';
            cancelBtn.onclick = () => {
              document.body.removeChild(jsonInput);
              document.body.removeChild(overlay);
              document.body.removeChild(btnContainer);
            };

            overlay.onclick = cancelBtn.onclick;

            btnContainer.appendChild(confirmBtn);
            btnContainer.appendChild(cancelBtn);

            document.body.appendChild(overlay);
            document.body.appendChild(jsonInput);
            document.body.appendChild(btnContainer);
            jsonInput.focus();
          }}
          className="flex-1 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white font-semibold py-3 sm:py-4 px-4 rounded-xl transition-all text-sm sm:text-base shadow-md hover:shadow-lg"
        >
          載入資料
        </button>
        <button
          onClick={handleSetLocation}
          className="flex-1 bg-white border-2 border-teal-500 text-teal-600 hover:bg-teal-50 active:bg-teal-100 font-semibold py-3 sm:py-4 px-4 rounded-xl transition-all text-sm sm:text-base shadow-md hover:shadow-lg"
        >
          設定位置
        </button>
        <button
          onClick={handleGetCurrentPosition}
          className="flex-1 bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50 active:bg-blue-100 font-semibold py-3 sm:py-4 px-4 rounded-xl transition-all text-sm sm:text-base shadow-md hover:shadow-lg"
        >
          顯示位置
        </button>
        <button
          onClick={handleNotifyFlutter}
          className="flex-1 bg-white border-2 border-purple-500 text-purple-600 hover:bg-purple-50 active:bg-purple-100 font-semibold py-3 sm:py-4 px-4 rounded-xl transition-all text-sm sm:text-base shadow-md hover:shadow-lg"
        >
          通知Flutter
        </button>
        {safetyData && (
          <button
            onClick={handleUpdateCenter}
            className="flex-1 bg-white border-2 border-teal-500 text-teal-600 hover:bg-teal-50 active:bg-teal-100 font-semibold py-3 sm:py-4 px-4 rounded-xl transition-all text-sm sm:text-base shadow-md hover:shadow-lg"
          >
            定位中心
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
