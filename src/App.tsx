import { useState, useEffect } from 'react';
import { MapView } from './components/MapView';
import { SafetyScoreIndicator } from './components/SafetyScoreIndicator';
import { MarkerData, SafetyAPIResponse } from './types';
import { loadSafetyData } from './utils/safetyDataLoader';

function App() {
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([25.0330, 121.5654]);
  const [safetyData, setSafetyData] = useState<SafetyAPIResponse | null>(null);
  const [showCurrentPosition, setShowCurrentPosition] = useState(false);
  const [showMap, setShowMap] = useState(true);

  const handleGetCurrentPosition = () => {
    let locationReceived = false;

    const handlePositionUpdate = (event: MessageEvent) => {
      try {
        const response = JSON.parse(event.data);
        if (response.name === 'location' && response.data) {
          const { latitude, longitude } = response.data;

          locationReceived = true;
          setMapCenter([latitude, longitude]);
          setShowMap(true);

          if (safetyData) {
            setSafetyData({
              ...safetyData,
              meta: {
                ...safetyData.meta,
                center: {
                  lat: latitude,
                  lng: longitude
                }
              }
            });
          }

          window.removeEventListener('message', handlePositionUpdate);
        }
      } catch (error) {
        console.error('解析位置失敗:', error);
      }
    };

    window.addEventListener('message', handlePositionUpdate);

    if ((window as any).flutterObject) {
      (window as any).flutterObject.postMessage(JSON.stringify({
        name: 'location',
        data: null
      }));
    }

    setShowCurrentPosition(true);
    setTimeout(() => {
      setShowCurrentPosition(false);
      window.removeEventListener('message', handlePositionUpdate);

      if (!locationReceived) {
        setMapCenter([25.033964, 121.564468]);
        setShowMap(true);
      }
    }, 5000);
  };

  useEffect(() => {
    handleGetCurrentPosition();

    let counter = 0;
    const interval = setInterval(async () => {
      counter += 10;
      const now = new Date();
      const timeStr = now.toLocaleTimeString('zh-TW', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      console.log(`update ${counter}s time ${timeStr}`);

      try {
        const data = await loadSafetyData(25.033964, 121.564468);

        const filteredData = {
          ...data,
          places: data.places.filter(place =>
            place.type === 'store' || place.type === 'police'
          )
        };

        setSafetyData(filteredData);
        setMapCenter([data.meta.center.lat, data.meta.center.lng]);
        setShowMap(true);
        console.log('自動載入安全資料成功 (僅顯示店家和警局)');
      } catch (error) {
        console.error('自動載入失敗：', error);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <header className="bg-gradient-to-r from-teal-500 to-teal-600 p-4 sm:p-5 flex-shrink-0 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          02夜歸
        </h1>
        <p className="text-teal-50 text-xs sm:text-sm mt-1">為您的安全把關</p>
      </header>

      {safetyData && (
        <SafetyScoreIndicator score={safetyData.summary.safety_score} />
      )}

      <div className="flex-1 overflow-hidden">
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

      <div className="fixed bottom-4 right-4 flex flex-col gap-3 z-[900]">
        <button
          onClick={() => {
            console.log('最近店家按鈕被點擊');
          }}
          className="bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 font-semibold w-20 h-20 rounded-full transition-all shadow-lg hover:shadow-xl flex flex-col items-center justify-center border-2 border-gray-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          <span className="text-xs">最近店家</span>
        </button>

        <button
          onClick={() => {
            console.log('緊急報案按鈕被點擊');
          }}
          className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold w-20 h-20 rounded-full transition-all shadow-lg hover:shadow-xl flex flex-col items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          <span className="text-xs">緊急報案</span>
        </button>

        <button
          onClick={async () => {
            try {
              const data = await loadSafetyData(25.033964, 121.564468);
              setSafetyData(data);
              setMapCenter([data.meta.center.lat, data.meta.center.lng]);
              setShowMap(true);
            } catch (error) {
              console.error('測試載入失敗：', error);
            }
          }}
          className="hidden bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white font-semibold py-3 px-5 rounded-full transition-all text-sm shadow-lg hover:shadow-xl whitespace-nowrap"
        >
          測試載入
        </button>
      </div>
    </div>
  );
}

export default App;
