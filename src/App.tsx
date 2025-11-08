import { useState, useEffect } from 'react';
import { MapView } from './components/MapView';
import { SafetyScoreIndicator } from './components/SafetyScoreIndicator';
// import { MarkerForm } from './components/MarkerForm';
// import { MarkerList } from './components/MarkerList';
// import { JsonInput } from './components/JsonInput';
// import { SafetySummary } from './components/SafetySummary';
// import { SafetyIndicator } from './components/SafetyIndicator';
// import { PlacesList } from './components/PlacesList';
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

  // const handleAddMarker = (lat: number, lng: number, radius: number, label: string) => {
  //   const newMarker: MarkerData = {
  //     id: `${Date.now()}-${Math.random()}`,
  //     lat,
  //     lng,
  //     radius,
  //     label,
  //   };
  //   setMarkers([...markers, newMarker]);
  //   setMapCenter([lat, lng]);
  // };

  // const handleDeleteMarker = (id: string) => {
  //   setMarkers(markers.filter((marker) => marker.id !== id));
  // };

  // const handleLoadJson = (jsonText: string) => {
  //   try {
  //     const data: SafetyAPIResponse = JSON.parse(jsonText.trim());
  //     setSafetyData(data);
  //     setMapCenter([data.meta.center.lat, data.meta.center.lng]);
  //   } catch (error) {
  //     alert('JSON 格式錯誤，請檢查輸入的資料');
  //     console.error('JSON parse error:', error);
  //   }
  // };

  // const handleLoadNewFormatJson = async () => {
  //   try {
  //     let data: NewFormatAPIResponse;

  //     try {
  //       const response = await fetch(`/mock/get_nearby_roads_safety?center_lat=25.033964&center_lng=121.564468`);

  //       if (response.ok) {
  //         data = await response.json();
  //       } else {
  //         throw new Error('API request failed');
  //       }
  //     } catch (fetchError) {
  //       console.warn('API request failed, using mock data', fetchError);
  //       data = {
  //         meta: {
  //           at: "2025-11-08T23:00:00+08:00",
  //           center: { lat: 25.033964, lng: 121.564468 },
  //           radius_m: 200,
  //           tz: "Asia/Taipei"
  //         },
  //         summary: {
  //           safety_score: 45.5,
  //           analysis: {
  //             cctv_count: 8,
  //             metro_count: 2,
  //             robbery_count: 1,
  //             streetlight_count: 25,
  //             police_count: 0
  //           }
  //         },
  //         resources: {
  //           cctv: [
  //             {
  //               safety: 1,
  //               type: "cctv",
  //               name: "CAM-12345",
  //               location: { lat: 25.03452, lng: 121.56501 },
  //               distance_m: 65,
  //               phone: ""
  //             }
  //           ],
  //           metro: [
  //             {
  //               safety: 1,
  //               type: "metro",
  //               name: "市政府站 1 號出口",
  //               location: { lat: 25.03398, lng: 121.56512 },
  //               distance_m: 120,
  //               phone: ""
  //             }
  //           ],
  //           criminal: [
  //             {
  //               safety: -1,
  //               type: "robbery_incident",
  //               name: "搶奪案件 - 2024-10-15",
  //               location: { lat: 25.03301, lng: 121.56389 },
  //               distance_m: 180,
  //               incident_date: "2024-10-15",
  //               incident_time: "22:00-24:00",
  //               location_desc: "信義區市府路",
  //               phone: ""
  //             }
  //           ],
  //           streetlight: [
  //             {
  //               safety: 1,
  //               type: "streetlight",
  //               name: "LIGHT-67890",
  //               location: { lat: 25.03421, lng: 121.56478 },
  //               distance_m: 45,
  //               phone: ""
  //             }
  //           ],
  //           police: [
  //             {
  //               safety: 1,
  //               type: "police",
  //               name: "信義分局",
  //               location: { lat: 25.03289, lng: 121.56234 },
  //               distance_m: 340,
  //               phone: "110",
  //               open_now: true
  //             }
  //           ]
  //         }
  //       };
  //     }

  //     const allPlaces: SafetyPlace[] = [
  //       ...data.resources.cctv,
  //       ...data.resources.metro,
  //       ...data.resources.criminal,
  //       ...data.resources.streetlight,
  //       ...data.resources.police
  //     ];

  //     const convertedData: SafetyAPIResponse = {
  //       meta: data.meta,
  //       summary: {
  //         level: data.summary.safety_score >= 70 ? 1 : data.summary.safety_score >= 40 ? 2 : 3,
  //         label: data.summary.safety_score >= 70 ? '安全' : data.summary.safety_score >= 40 ? '需注意' : '危險',
  //         safety_score: data.summary.safety_score,
  //         analysis: {
  //           safe_places: data.summary.analysis.cctv_count + data.summary.analysis.metro_count + data.summary.analysis.police_count,
  //           warning_zones: data.summary.analysis.robbery_count,
  //           lighting_score: data.summary.analysis.streetlight_count / 30,
  //           police_distance_m: data.resources.police.length > 0 ? data.resources.police[0].distance_m : 999,
  //           last_incident_days: 30
  //         }
  //       },
  //       places: allPlaces
  //     };

  //     setSafetyData(convertedData);
  //     setMapCenter([data.meta.center.lat, data.meta.center.lng]);
  //   } catch (error) {
  //     console.error('Unexpected error:', error);
  //   }
  // };

  // const handleUpdateCenter = () => {
  //   if (safetyData) {
  //     setMapCenter([safetyData.meta.center.lat, safetyData.meta.center.lng]);
  //   }
  // };

  // const handleSetLocation = async () => {
  //   const input = prompt('請輸入座標 (格式: 25.033, 121.565) 或地址:');
  //   if (!input) return;

  //   const coordPattern = /^(-?\d+\.?\d*)\s*,?\s*(-?\d+\.?\d*)$/;
  //   const match = input.trim().match(coordPattern);

  //   if (match) {
  //     const lat = parseFloat(match[1]);
  //     const lng = parseFloat(match[2]);
  //     if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
  //       setMapCenter([lat, lng]);
  //     } else {
  //       alert('座標超出有效範圍');
  //     }
  //   } else {
  //     try {
  //       const response = await fetch(
  //         `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&limit=1`
  //       );
  //       const data = await response.json();
  //       if (data && data.length > 0) {
  //         const lat = parseFloat(data[0].lat);
  //         const lng = parseFloat(data[0].lon);
  //         setMapCenter([lat, lng]);
  //       } else {
  //         alert('找不到該地址，請重新輸入');
  //       }
  //     } catch (error) {
  //       alert('地址查詢失敗，請檢查網路連線');
  //       console.error('Geocoding error:', error);
  //     }
  //   }
  // };

  // const handleNotifyFlutter = () => {
  //   const message = {
  //     name: 'mapCenter',
  //     data: {
  //       latitude: mapCenter[0],
  //       longitude: mapCenter[1]
  //     }
  //   };

  //   if ((window as any).flutterObject) {
  //     (window as any).flutterObject.postMessage(JSON.stringify(message));
  //     alert('已通知 Flutter');
  //   } else {
  //     alert('Flutter 環境未偵測到');
  //   }
  // };

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
