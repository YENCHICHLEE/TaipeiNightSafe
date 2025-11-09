import { useState, useEffect, useRef } from 'react';
import { MapView } from './components/MapView';
import { SafetyScoreIndicator } from './components/SafetyScoreIndicator';
import { MarkerData, SafetyAPIResponse } from './types';
import { loadSafetyData } from './utils/safetyDataLoader';
import { loadRoadSafetyData, RoadSafetyData } from './utils/roadSafetyDataLoader';
import { sendNotification, makePhoneCall } from './utils/flutterBridge';
import { GPSSyncReceiver } from './utils/gpsSync';

function App() {
  const [markers] = useState<MarkerData[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([25.0330, 121.5654]);
  const [safetyData, setSafetyData] = useState<SafetyAPIResponse | null>(null);
  const [showCurrentPosition, setShowCurrentPosition] = useState(true);
  const [isMoving, setIsMoving] = useState(false);
  
  // 區域安全相關狀態
  const [roadSafetyData, setRoadSafetyData] = useState<RoadSafetyData | null>(null);
  const [roadSafetyLoading, setRoadSafetyLoading] = useState(false);
  const [roadSafetyError, setRoadSafetyError] = useState<string | null>(null);
  
  // 移動軌跡記錄
  const [movementPath, setMovementPath] = useState<[number, number][]>([]);
  
  // GPS 同步
  const gpsSyncRef = useRef<GPSSyncReceiver | null>(null);

  // 載入區域安全資料
  const fetchRoadSafety = async () => {
    try {
      setRoadSafetyLoading(true);
      setRoadSafetyError(null);
      const data = await loadRoadSafetyData(mapCenter[0], mapCenter[1]);
      setRoadSafetyData(data);
      console.log('✅ 區域安全資料載入成功');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setRoadSafetyError('無法載入道路安全資料: ' + errorMsg);
      console.error('❌ 區域安全資料載入失敗:', err);
    } finally {
      setRoadSafetyLoading(false);
    }
  };

  useEffect(() => {
    // 進入頁面時自動發送通知
    console.log('🎯 App 已載入，發送位置分享通知');
    const success = sendNotification(
      '位置分享',
      'xxx 正傳送他的位置給你'
    );
    if (success) {
      console.log('✅ 位置分享通知已發送給 Flutter');
    } else {
      console.warn('⚠️ Flutter 環境未偵測到，通知未發送');
    }
    
    // 初始化 GPS 同步接收
    gpsSyncRef.current = new GPSSyncReceiver();
    gpsSyncRef.current.connect((data) => {
      console.log('📍 收到位置同步:', data);
      
      // 更新地圖中心
      setMapCenter([data.lat, data.lng]);
      setShowCurrentPosition(true);
      setIsMoving(true);
      
      // 更新移動軌跡
      setMovementPath((prev) => [...prev, [data.lat, data.lng]]);
      
      // 如果有道路資料，更新道路資料
      if (data.roads) {
        setRoadSafetyData(data.roads);
      }
      
      // 如果有安全資料，更新安全資料
      if (data.safetyData) {
        console.log('🔄 更新安全資料，新的 safety_score:', data.safetyData.summary?.safety_score);
        setSafetyData(data.safetyData);
      } else {
        console.log('⚠️ 收到的位置更新沒有包含 safetyData');
      }
      
      // 停止移動動畫（0.5秒後）
      setTimeout(() => setIsMoving(false), 500);
    });
    
    return () => {
      if (gpsSyncRef.current) {
        gpsSyncRef.current.disconnect();
      }
    };
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
          你正在查看 xxx 的行程
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
          isMoving={isMoving}
          roads={roadSafetyData?.roads}
          showRoads={true}
          movementPath={movementPath}
        />
      </div>

      <div className="fixed bottom-4 right-4 flex flex-col gap-3 z-[900]">
        <button
          onClick={() => {
            console.log('📞 撥打電話按鈕被點擊');
            const success = makePhoneCall('110');
            if (success) {
              console.log('✅ 撥號請求已發送給 Flutter');
            } else {
              console.warn('⚠️ Flutter 環境未偵測到');
            }
          }}
          className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold w-20 h-20 rounded-full transition-all shadow-lg hover:shadow-xl flex flex-col items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          <span className="text-xs">緊急報案</span>
        </button>
      </div>
    </div>
  );
}

export default App;
