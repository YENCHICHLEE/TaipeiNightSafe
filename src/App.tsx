import { useState, useEffect } from 'react';
import { MapView } from './components/MapView';
import { MarkerForm } from './components/MarkerForm';
import { MarkerList } from './components/MarkerList';
import { JsonInput } from './components/JsonInput';
import { SafetySummary } from './components/SafetySummary';
import { SafetyIndicator } from './components/SafetyIndicator';
import { PlacesList } from './components/PlacesList';
import { MarkerData, SafetyAPIResponse, NewFormatAPIResponse, SafetyPlace } from './types';

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
      const data: SafetyAPIResponse = JSON.parse(jsonText.trim());
      setSafetyData(data);
      setMapCenter([data.meta.center.lat, data.meta.center.lng]);
    } catch (error) {
      alert('JSON 格式錯誤，請檢查輸入的資料');
      console.error('JSON parse error:', error);
    }
  };

  const handleLoadNewFormatJson = async () => {
    try {
      let data: NewFormatAPIResponse;

      try {
        const response = await fetch(`/mock/get_nearby_roads_safety?center_lat=25.033964&center_lng=121.564468`);

        if (response.ok) {
          data = await response.json();
        } else {
          throw new Error('API request failed');
        }
      } catch (fetchError) {
        console.warn('API request failed, using mock data', fetchError);
        data = {
          meta: {
            at: "2025-11-08T23:00:00+08:00",
            center: { lat: 25.033964, lng: 121.564468 },
            radius_m: 200,
            tz: "Asia/Taipei"
          },
          summary: {
            safety_score: 45.5,
            analysis: {
              cctv_count: 8,
              metro_count: 2,
              robbery_count: 1,
              streetlight_count: 25,
              police_count: 0
            }
          },
          resources: {
            cctv: [
              {
                safety: 1,
                type: "cctv",
                name: "CAM-12345",
                location: { lat: 25.03452, lng: 121.56501 },
                distance_m: 65,
                phone: ""
              }
            ],
            metro: [
              {
                safety: 1,
                type: "metro",
                name: "市政府站 1 號出口",
                location: { lat: 25.03398, lng: 121.56512 },
                distance_m: 120,
                phone: ""
              }
            ],
            criminal: [
              {
                safety: -1,
                type: "robbery_incident",
                name: "搶奪案件 - 2024-10-15",
                location: { lat: 25.03301, lng: 121.56389 },
                distance_m: 180,
                incident_date: "2024-10-15",
                incident_time: "22:00-24:00",
                location_desc: "信義區市府路",
                phone: ""
              }
            ],
            streetlight: [
              {
                safety: 1,
                type: "streetlight",
                name: "LIGHT-67890",
                location: { lat: 25.03421, lng: 121.56478 },
                distance_m: 45,
                phone: ""
              }
            ],
            police: [
              {
                safety: 1,
                type: "police",
                name: "信義分局",
                location: { lat: 25.03289, lng: 121.56234 },
                distance_m: 340,
                phone: "110",
                open_now: true
              }
            ]
          }
        };
      }

      const allPlaces: SafetyPlace[] = [
        ...data.resources.cctv,
        ...data.resources.metro,
        ...data.resources.criminal,
        ...data.resources.streetlight,
        ...data.resources.police
      ];

      const convertedData: SafetyAPIResponse = {
        meta: data.meta,
        summary: {
          level: data.summary.safety_score >= 70 ? 1 : data.summary.safety_score >= 40 ? 2 : 3,
          label: data.summary.safety_score >= 70 ? '安全' : data.summary.safety_score >= 40 ? '需注意' : '危險',
          safety_score: data.summary.safety_score,
          analysis: {
            safe_places: data.summary.analysis.cctv_count + data.summary.analysis.metro_count + data.summary.analysis.police_count,
            warning_zones: data.summary.analysis.robbery_count,
            lighting_score: data.summary.analysis.streetlight_count / 30,
            police_distance_m: data.resources.police.length > 0 ? data.resources.police[0].distance_m : 999,
            last_incident_days: 30
          }
        },
        places: allPlaces
      };

      setSafetyData(convertedData);
      setMapCenter([data.meta.center.lat, data.meta.center.lng]);
    } catch (error) {
      console.error('Unexpected error:', error);
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

 const handleShareLocation = async () => {
  try {
    const [lat, lng] = mapCenter;
    const url = `https://www.google.com/maps?q=${lat},${lng}`;

    // 支援 Web Share API
    if (navigator.share) {
      await navigator.share({
        title: "我的位置",
        text: "這是我目前的位置",
        url,
      });
      return;
    }

    // fallback → 直接複製
    await navigator.clipboard.writeText(url);
    alert("已複製位置連結！");
  } catch (e) {
    console.error("分享失敗", e);
    alert("分享失敗");
  }
};
 

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <header className="bg-gradient-to-r from-teal-500 to-teal-600 p-4 sm:p-5 flex-shrink-0 shadow-sm">
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          01夜歸
        </h1>
        <p className="text-teal-50 text-xs sm:text-sm mt-1">為您的安全把關</p>
      </header>

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
          className="bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white font-semibold py-3 px-5 rounded-full transition-all text-sm shadow-lg hover:shadow-xl whitespace-nowrap"
        >
          載入資料
        </button>
        <button
          onClick={handleLoadNewFormatJson}
          className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold py-3 px-5 rounded-full transition-all text-sm shadow-lg hover:shadow-xl whitespace-nowrap"
        >
          載入新格式
        </button>
      </div>
    </div>
  );
}

export default App;
