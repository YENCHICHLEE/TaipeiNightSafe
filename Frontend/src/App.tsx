import { useState, useEffect, useCallback, useRef } from 'react';
import { MapView } from './components/MapView';
import { SafetyScoreIndicator } from './components/SafetyScoreIndicator';
import { MarkerData, SafetyAPIResponse } from './types';
import { loadSafetyData } from './utils/safetyDataLoader';
import { loadRoadSafetyData, RoadSafetyData } from './utils/roadSafetyDataLoader';
import { sendNotification, makePhoneCall, isFlutterEnvironment } from './utils/flutterBridge';
import { isWithinKnownRoads, findNearestRoad } from './utils/roadSegmentChecker';
import { GPSSyncSender } from './utils/gpsSync';

function App() {
  const [markers] = useState<MarkerData[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([25.0330, 121.5654]);
  const [safetyData, setSafetyData] = useState<SafetyAPIResponse | null>(null);
  const [showCurrentPosition, setShowCurrentPosition] = useState(true);
  const [isMoving, setIsMoving] = useState(false);
  
  // 區域安全相關狀態
  const [roadSafetyData, setRoadSafetyData] = useState<RoadSafetyData | null>(null);

  // 模擬移動相關狀態
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationInterval, setSimulationInterval] = useState<NodeJS.Timeout | null>(null);
  
  // 移動軌跡記錄
  const [movementPath, setMovementPath] = useState<[number, number][]>([]);
  
  // GPS 同步
  const gpsSyncRef = useRef<GPSSyncSender | null>(null);



  // 更新位置並載入資料（只在需要時）
  const updateLocationAndLoadData = useCallback(async (lat: number, lng: number, forceReload: boolean = false) => {
    setMapCenter([lat, lng]);
    setShowCurrentPosition(true);
    
    // 記錄移動軌跡
    setMovementPath((prev) => [...prev, [lat, lng]]);
    
    // 檢查是否在已知路段範圍內
    const withinKnownRoads = roadSafetyData?.roads 
      ? isWithinKnownRoads(lat, lng, roadSafetyData.roads, 30)
      : false;

    // 只有在離開已知路段或強制重新載入時才呼叫 API
    if (!withinKnownRoads || forceReload) {
      try {
        console.log(`📍 位置更新: ${lat.toFixed(6)}, ${lng.toFixed(6)} - 重新載入資料`);
        const data = await loadSafetyData(lat, lng);
        setSafetyData(data);
        
        const roadData = await loadRoadSafetyData(lat, lng);
        setRoadSafetyData(roadData);
        
        // 同步位置到 Frontend-2
        if (gpsSyncRef.current) {
          gpsSyncRef.current.sendLocation(lat, lng, roadData, data);
        }
        
        console.log('✅ 資料載入完成');
      } catch (error) {
        console.error('❌ 載入資料失敗:', error);
      }
    } else {
      // 在已知路段內，只更新位置，不重新載入
      if (roadSafetyData?.roads) {
        const nearest = findNearestRoad(lat, lng, roadSafetyData.roads);
        if (nearest) {
          console.log(`📍 位置更新: ${lat.toFixed(6)}, ${lng.toFixed(6)} - 在 ${nearest.road.road_name} 附近 (${nearest.distance.toFixed(1)}m)`);
        }
      }
      
      // 即使不重新載入，也要同步位置和現有的安全資料
      if (gpsSyncRef.current) {
        gpsSyncRef.current.sendLocation(lat, lng, roadSafetyData, safetyData);
      }
    }
  }, [roadSafetyData]);

  // 開始模擬移動（沿著最近的路徑走）
  const startSimulation = () => {
    if (isSimulating) return;
    
    if (!roadSafetyData || roadSafetyData.roads.length === 0) {
      console.warn('⚠️ 沒有可用的路徑資料');
      alert('沒有可用的路徑資料，請先載入資料');
      return;
    }
    
    // 找到最近的路段
    const nearest = findNearestRoad(mapCenter[0], mapCenter[1], roadSafetyData.roads);
    if (!nearest) {
      console.warn('⚠️ 找不到最近的路段');
      return;
    }
    
    console.log(`🚶 開始沿著 ${nearest.road.road_name} 移動`);
    setIsSimulating(true);
    setIsMoving(true);
    
    // 記錄起始位置
    setMovementPath([mapCenter]);
    
    // 找到最近路段的索引
    const roadIndex = roadSafetyData.roads.findIndex(r => r.road_name === nearest.road.road_name);
    
    // 找到最近的節點索引
    const road = roadSafetyData.roads[roadIndex];
    let closestNodeIndex = 0;
    let minDistance = Infinity;
    
    road.nodes.forEach((node, index) => {
      const distance = Math.sqrt(
        Math.pow(node[0] - mapCenter[0], 2) + 
        Math.pow(node[1] - mapCenter[1], 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestNodeIndex = index;
      }
    });
    
    console.log(`📍 從節點 ${closestNodeIndex}/${road.nodes.length} 開始`);
    
    // 每 15 秒移動到下一個節點
    let localRoadIndex = roadIndex;
    let localNodeIndex = closestNodeIndex;
    
    const interval = setInterval(() => {
      if (!roadSafetyData || roadSafetyData.roads.length === 0) {
        return;
      }
      
      const currentRoad = roadSafetyData.roads[localRoadIndex];
      localNodeIndex++;
      
      // 如果當前路段走完了，切換到下一條路段
      if (localNodeIndex >= currentRoad.nodes.length) {
        localRoadIndex = (localRoadIndex + 1) % roadSafetyData.roads.length;
        localNodeIndex = 0;
        
        const nextRoad = roadSafetyData.roads[localRoadIndex];
        console.log(`🔄 切換到下一條路段: ${nextRoad.road_name}`);
        
        // 移動到新路段的第一個節點
        const [newLat, newLng] = nextRoad.nodes[0];
        updateLocationAndLoadData(newLat, newLng, false);
        setMapCenter([newLat, newLng]);
      } else {
        // 移動到當前路段的下一個節點
        const [newLat, newLng] = currentRoad.nodes[localNodeIndex];
        updateLocationAndLoadData(newLat, newLng, false);
        setMapCenter([newLat, newLng]);
      }
    }, 15000);
    
    setSimulationInterval(interval);
  };

  // 停止模擬移動
  const stopSimulation = () => {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      setSimulationInterval(null);
    }
    setIsSimulating(false);
    setIsMoving(false);
    console.log(`⏸️ 停止模擬移動，共記錄 ${movementPath.length} 個軌跡點`);
  };
  
  // 清除軌跡
  const clearPath = () => {
    setMovementPath([]);
    console.log('🗑️ 已清除移動軌跡');
  };

  useEffect(() => {
    console.log('🎯 App 已載入，開始載入安全資料');
    
    // 初始化 GPS 同步
    gpsSyncRef.current = new GPSSyncSender();
    gpsSyncRef.current.connect();
    
    const loadInitialData = async () => {
      try {
        const data = await loadSafetyData(25.033964, 121.564468);
        setSafetyData(data);
        const initialCenter: [number, number] = [data.meta.center.lat, data.meta.center.lng];
        setMapCenter(initialCenter);
        // 記錄初始位置為軌跡起點
        setMovementPath([initialCenter]);
        console.log('✅ 安全資料載入成功');
        
        // 初始載入道路安全資料
        const roadData = await loadRoadSafetyData(25.033964, 121.564468);
        setRoadSafetyData(roadData);
        console.log('✅ 道路安全資料載入成功');
        
        // 發送初始位置
        if (gpsSyncRef.current) {
          gpsSyncRef.current.sendLocation(initialCenter[0], initialCenter[1], roadData, data);
        }
      } catch (error) {
        console.error('❌ 初始載入失敗：', error);
      }
    };
    
    loadInitialData();

    // 監聽 Flutter 傳來的位置訊息
    const handleFlutterMessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.name === 'location' && parsed.data) {
          const { latitude, longitude } = parsed.data;
          console.log(`📍 收到 Flutter 位置更新: ${latitude}, ${longitude}`);
          updateLocationAndLoadData(latitude, longitude, true); // 強制重新載入
        }
      } catch (err) {
        // 忽略非 JSON 訊息
      }
    };

    window.addEventListener('message', handleFlutterMessage);
    
    return () => {
      window.removeEventListener('message', handleFlutterMessage);
      // 清理模擬移動的 interval
      if (simulationInterval) {
        clearInterval(simulationInterval);
      }
      // 斷開 GPS 同步
      if (gpsSyncRef.current) {
        gpsSyncRef.current.disconnect();
      }
    };
  }, []); // 空依賴陣列，只在組件掛載時執行一次

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

        <button
          onClick={() => {
            console.log('🔵 告知親友按鈕被點擊');
            
            // 顯示彈窗提示
            alert('✅ 已將定位傳送給媽媽');
            
            // 可選：同時發送通知給 Flutter
            if (isFlutterEnvironment()) {
              sendNotification('告知親友', '已將您的定位傳送給媽媽');
            }
          }}
          className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold w-20 h-20 rounded-full transition-all shadow-lg hover:shadow-xl flex flex-col items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span className="text-xs">告知親友</span>
        </button>

        <button
          onClick={() => {
            if (isSimulating) {
              stopSimulation();
            } else {
              startSimulation();
            }
          }}
          className={`${
            isSimulating 
              ? 'bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700' 
              : 'bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700'
          } text-white font-semibold w-20 h-20 rounded-full transition-all shadow-lg hover:shadow-xl flex flex-col items-center justify-center`}
        >
          {isSimulating ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
              <span className="text-xs">停止移動</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <span className="text-xs">模擬移動</span>
            </>
          )}
        </button>

        {movementPath.length > 1 && (
          <button
            onClick={clearPath}
            className="bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white font-semibold w-20 h-20 rounded-full transition-all shadow-lg hover:shadow-xl flex flex-col items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            <span className="text-xs">清除軌跡</span>
          </button>
        )}

      </div>
    </div>
  );
}

export default App;
