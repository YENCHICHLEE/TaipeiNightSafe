import { useState } from 'react';
import { MapContainer, TileLayer, Polyline, Popup, Marker, useMapEvents } from 'react-leaflet';
import axios from 'axios';
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet/dist/leaflet.css';
import './App.css';
import type { RoutePoint } from './types';

interface RouteSegment {
  segment_index: number;
  location: { lat: number; lng: number };
  cctv_count: number;
  metro_count: number;
  robbery_count: number;
  streetlight_count: number;
  police_count: number;
  safety_score: number;
  level: number;
  label: string;
}

interface AnalyzedRoute {
  route_index: number;
  is_recommended: boolean;
  geometry: [number, number][];
  distance_m: number;
  duration_s: number;
  summary: {
    total_segments: number;
    total_cctv: number;
    total_metro: number;
    total_robbery: number;
    total_streetlight: number;
    total_police: number;
    overall_score: number;
    level: number;
    label: string;
  };
  segments: RouteSegment[];
}

function App() {
  // 預設改為路徑規劃
  const activeTab = 'route'; // 固定為路徑規劃模式
  // const [roads, setRoads] = useState<Road[]>([]);
  // const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [summary, setSummary] = useState<Summary | null>(null);
  
  // 路徑規劃狀態
  const [startPoint, setStartPoint] = useState<RoutePoint>({ lat: 25.033964, lng: 121.564468 });
  const [endPoint, setEndPoint] = useState<RoutePoint | null>(null); // 改為 null，等待用戶輸入
  const [destinationSearch, setDestinationSearch] = useState<string>(''); // 目的地搜索框
  const [searchLoading, setSearchLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [allRoutes, setAllRoutes] = useState<AnalyzedRoute[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  
  // 點擊地圖的位置
  const [clickedPosition, setClickedPosition] = useState<RoutePoint | null>(null);
  
  // 註解掉區域安全相關的程式碼
  // const hasLoadedAreaData = useRef(false);
  // const [center] = useState({ lat: 25.033964, lng: 121.564468 });
  // const searchRadius = 100;
  // const safetyRadius = 50;

  // const fetchRoadSafety = async () => {
  //   try {
  //     setLoading(true);
  //     const response = await axios.get<RoadSafetyResponse>('http://localhost:5001/get_nearby_roads_safety', {
  //       params: {
  //         center_lat: center.lat,
  //         center_lng: center.lng,
  //         search_radius_m: searchRadius,
  //         safety_radius_m: safetyRadius
  //       }
  //     });
  //     
  //     setRoads(response.data.roads);
  //     setSummary(response.data.summary);
  //     setError(null);
  //   } catch (err) {
  //     setError('無法載入道路安全資料: ' + (err instanceof Error ? err.message : String(err)));
  //     console.error('API Error:', err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // useEffect(() => {
  //   if (activeTab === 'area' && !hasLoadedAreaData.current) {
  //     hasLoadedAreaData.current = true;
  //     fetchRoadSafety();
  //   }
  // }, [activeTab]);

  // const getColor = (score: number): string => {
  //   if (score >= 60) return '#22c55e';
  //   if (score >= 40) return '#eab308';
  //   return '#ef4444';
  // };

  // 根據等級返回顏色
  const getLevelColor = (level: number): string => {
    if (level === 3) return '#22c55e'; // 安全
    if (level === 2) return '#eab308'; // 需注意
    return '#ef4444'; // 危險
  };

  // 搜索目的地並轉換為經緯度
  const searchDestination = async () => {
    if (!destinationSearch.trim()) {
      setError('請輸入目的地');
      return;
    }

    try {
      setSearchLoading(true);
      setError(null);

      console.log('🔍 搜尋目的地:', destinationSearch);

      // 使用 OpenStreetMap provider 進行地理編碼
      const provider = new OpenStreetMapProvider({
        params: {
          countrycodes: 'tw', // 限制在台灣
          'accept-language': 'zh-TW', // 優先使用繁體中文
        },
      });

      // 搜尋地點，優先搜尋台北市範圍
      const searchQuery = destinationSearch.includes('台北') 
        ? destinationSearch 
        : `台北 ${destinationSearch}`;
      
      const results = await provider.search({ query: searchQuery });

      if (!results || results.length === 0) {
        setError(`找不到地點: ${destinationSearch}`);
        setSearchLoading(false);
        return;
      }

      // 取得第一個結果
      const result = results[0];
      const lat = result.y; // leaflet-geosearch 使用 y 作為緯度
      const lng = result.x; // leaflet-geosearch 使用 x 作為經度
      
      console.log(`✅ 找到地點: ${result.label} (${lat}, ${lng})`);

      setEndPoint({ lat, lng });
      
      // 自動計算路徑
      calculateRoute({ lat, lng });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError('搜尋地點失敗: ' + errorMsg);
      console.error('❌ 搜尋錯誤:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // 處理「前往此地」按鈕點擊
  const handleGoToLocation = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡到地圖
    if (clickedPosition) {
      const newEndPoint = clickedPosition;
      setEndPoint(newEndPoint);
      setClickedPosition(null);
      // 自動計算路徑，使用新的終點
      calculateRoute(newEndPoint);
    }
  };

  // 地圖點擊事件處理組件
  function MapClickHandler() {
    useMapEvents({
      click: (e) => {
        if (activeTab === 'route') {
          setClickedPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
      },
    });
    return null;
  }

  // 計算多條路徑並找出最安全的
  const calculateRoute = async (customEndPoint?: RoutePoint) => {
    try {
      setRouteLoading(true);
      setError(null);
      setAllRoutes([]);
      
      // 使用傳入的終點或當前的 endPoint state
      const targetEndPoint = customEndPoint || endPoint;
      
      if (!targetEndPoint) {
        setError('請先輸入目的地');
        setRouteLoading(false);
        return;
      }
      
      console.log('🚀 開始尋找安全路徑...');
      
      // 使用新的 API 找出多條路徑並分析安全性
      const response = await axios.post('http://localhost:5001/find_safe_routes', {
        start_lat: startPoint.lat,
        start_lng: startPoint.lng,
        end_lat: targetEndPoint.lat,
        end_lng: targetEndPoint.lng,
        radius_m: 200
      });
      
      console.log(`✅ 找到 ${response.data.total_routes} 條路徑`);
      console.log(`🏆 推薦路徑: 路徑 ${response.data.recommended_route_index + 1}`);
      
      setAllRoutes(response.data.routes);
      setSelectedRouteIndex(response.data.recommended_route_index);
      
      // 顯示每條路徑的資訊
      response.data.routes.forEach((route: AnalyzedRoute, idx: number) => {
        const icon = route.is_recommended ? '🏆' : '📍';
        console.log(`${icon} 路徑 ${idx + 1}: ${route.summary.label} (分數: ${route.summary.overall_score}, 距離: ${(route.distance_m / 1000).toFixed(2)}km)`);
      });
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError('無法計算路徑: ' + errorMsg);
      console.error('❌ 路徑計算錯誤:', err);
    } finally {
      setRouteLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="header">
        <h1>🛡️ 道路安全地圖</h1>
        <p>顯示台北市道路安全評分（基於監視器與捷運站分布）</p>
        
        {/* 註解掉區域安全標籤 */}
        {/* <div className="tabs">
          <button 
            className={`tab ${activeTab === 'area' ? 'active' : ''}`}
            onClick={() => setActiveTab('area')}
          >
            區域安全
          </button>
          <button 
            className={`tab ${activeTab === 'route' ? 'active' : ''}`}
            onClick={() => setActiveTab('route')}
          >
            路徑規劃
          </button>
        </div> */}
      </header>

      {/* 註解掉區域安全的載入和錯誤顯示 */}
      {/* {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>載入中...</p>
        </div>
      )}

      {error && activeTab === 'area' && (
        <div className="error">
          <p>❌ {error}</p>
          {error.includes('load too high') && (
            <p className="error-hint">💡 Overpass API 伺服器負載過高，請稍後再試</p>
          )}
          <button onClick={fetchRoadSafety}>重試</button>
        </div>
      )} */}

      {error && activeTab === 'route' && (
        <div className="error">
          <p>❌ {error}</p>
          {error.includes('load too high') && (
            <p className="error-hint">💡 路徑計算服務繁忙，請稍後再試</p>
          )}
          <button onClick={() => calculateRoute()}>重試</button>
        </div>
      )}

      {activeTab === 'route' && (
        <div className="route-controls">
          <div className="control-group">
            <label>起點經緯度</label>
            <div className="coord-inputs">
              <input 
                type="number" 
                step="0.000001"
                value={startPoint.lat} 
                onChange={(e) => setStartPoint({...startPoint, lat: parseFloat(e.target.value)})}
                placeholder="緯度"
              />
              <input 
                type="number" 
                step="0.000001"
                value={startPoint.lng} 
                onChange={(e) => setStartPoint({...startPoint, lng: parseFloat(e.target.value)})}
                placeholder="經度"
              />
            </div>
          </div>
          
          <div className="control-group">
            <label>目的地</label>
            <div className="coord-inputs" style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                value={destinationSearch} 
                onChange={(e) => setDestinationSearch(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    searchDestination();
                  }
                }}
                placeholder="輸入地點名稱，例如：台北101、台北車站"
                style={{ flex: 1 }}
              />
              <button 
                className="calculate-btn" 
                onClick={searchDestination}
                disabled={searchLoading || !destinationSearch.trim()}
                style={{ width: 'auto', padding: '0 20px' }}
              >
                {searchLoading ? '搜尋中...' : '搜尋'}
              </button>
            </div>
            {endPoint && (
              <div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
                📍 目的地座標: {endPoint.lat.toFixed(6)}, {endPoint.lng.toFixed(6)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 註解掉區域安全的摘要和地圖顯示 */}
      {/* {activeTab === 'area' && summary && (
        <div className="summary">
          <div className="summary-card">
            <h3>區域安全評估</h3>
            <div className="summary-badge" style={{ backgroundColor: getLevelColor(summary.level) }}>
              {summary.label}
            </div>
            <div className="summary-stats">
              <div className="stat">
                <span className="stat-label">總分數</span>
                <span className="stat-value">{summary.overall_score}</span>
              </div>
              <div className="stat">
                <span className="stat-label">道路數</span>
                <span className="stat-value">{summary.total_roads}</span>
              </div>
              <div className="stat">
                <span className="stat-label">監視器</span>
                <span className="stat-value">{summary.total_cctv}</span>
              </div>
              <div className="stat">
                <span className="stat-label">捷運站</span>
                <span className="stat-value">{summary.total_metro}</span>
              </div>
            </div>
          </div>

          <div className="legend">
            <h4>圖例</h4>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#22c55e' }}></span>
              <span>安全 (分數 ≥ 60)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#eab308' }}></span>
              <span>需注意 (分數 40-59)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
              <span>危險 (分數 &lt; 40)</span>
            </div>
          </div>
        </div>
      )} */}

      {/* 地圖容器 - 根據不同 tab 顯示不同內容 */}
      {/* {activeTab === 'area' && !loading && !error && (
        <MapContainer 
          center={[center.lat, center.lng]} 
          zoom={15} 
          className="map-container"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <Circle
            center={[center.lat, center.lng]}
            radius={safetyRadius}
            pathOptions={{ 
              color: '#3b82f6', 
              fillColor: '#3b82f6', 
              fillOpacity: 0.1,
              weight: 2,
              dashArray: '5, 5'
            }}
          >
            <Popup>
              <strong>搜尋中心</strong><br />
              安全檢測半徑: {safetyRadius}m
            </Popup>
          </Circle>

          {roads.map((road, index) => (
            <Polyline
              key={index}
              positions={road.nodes}
              pathOptions={{
                color: getColor(road.safety_score),
                weight: 5,
                opacity: 0.7
              }}
            >
              <Popup>
                <div className="road-popup">
                  <h4>{road.road_name}</h4>
                  <p><strong>類型:</strong> {road.road_type}</p>
                  <p><strong>安全分數:</strong> {road.safety_score}</p>
                  <p><strong>等級:</strong> <span style={{ color: getLevelColor(road.level) }}>{road.label}</span></p>
                  <hr />
                  <p>📹 監視器: {road.cctv_count}</p>
                  <p>🚇 捷運站: {road.metro_count}</p>
                </div>
              </Popup>
            </Polyline>
          ))}
        </MapContainer>
      )} */}

      {/* 路徑規劃地圖 - 移到最上面優先顯示 */}
      {activeTab === 'route' && (
        <MapContainer 
          center={[startPoint.lat, startPoint.lng]} 
          zoom={13} 
          className="map-container"
          key="route-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* 地圖點擊事件處理 */}
          <MapClickHandler />
          
          {/* 起點標記 */}
          <Marker position={[startPoint.lat, startPoint.lng]}>
            <Popup>
              <strong>🟢 起點</strong><br />
              {startPoint.lat.toFixed(6)}, {startPoint.lng.toFixed(6)}
            </Popup>
          </Marker>

          {/* 終點標記 - 只在有終點時顯示 */}
          {endPoint && (
            <Marker position={[endPoint.lat, endPoint.lng]}>
              <Popup>
                <strong>🔴 終點</strong><br />
                {endPoint.lat.toFixed(6)}, {endPoint.lng.toFixed(6)}
              </Popup>
            </Marker>
          )}

          {/* 點擊位置標記 */}
          {clickedPosition && (
            <Marker position={[clickedPosition.lat, clickedPosition.lng]}>
              <Popup>
                <div 
                  style={{ textAlign: 'center' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <strong>📍 選擇的位置</strong><br />
                  {clickedPosition.lat.toFixed(6)}, {clickedPosition.lng.toFixed(6)}<br />
                  <button 
                    onClick={handleGoToLocation}
                    style={{
                      marginTop: '10px',
                      padding: '8px 16px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    前往此地
                  </button>
                </div>
              </Popup>
            </Marker>
          )}

          {/* 顯示所有路徑 - 只在有路徑資料時顯示 */}
          {!routeLoading && allRoutes.length > 0 && allRoutes.map((route, routeIdx) => {
            const isSelected = routeIdx === selectedRouteIndex;
            const isRecommended = route.is_recommended;
            const routeGeometry = route.geometry;
            const segments = route.segments;
            
            // 找到每個取樣點在路徑中最接近的索引
            const findClosestPointIndex = (targetLat: number, targetLng: number): number => {
              let minDist = Infinity;
              let closestIdx = 0;
              
              routeGeometry.forEach((point: [number, number], idx: number) => {
                const dist = Math.sqrt(
                  Math.pow(point[0] - targetLat, 2) + 
                  Math.pow(point[1] - targetLng, 2)
                );
                if (dist < minDist) {
                  minDist = dist;
                  closestIdx = idx;
                }
              });
              
              return closestIdx;
            };
            
            // 為每個區段找到對應的路徑點索引
            const segmentIndices = segments.map((segment: RouteSegment) => 
              findClosestPointIndex(segment.location.lat, segment.location.lng)
            );
            
            return (
              <div key={`route-${routeIdx}`}>
                {/* 繪製路徑的每個區段 */}
                {segments.map((segment: RouteSegment, segIdx: number) => {
                  const startIdx = segIdx === 0 ? 0 : segmentIndices[segIdx - 1];
                  const endIdx = segmentIndices[segIdx];
                  const finalEndIdx = segIdx === segments.length - 1 
                    ? routeGeometry.length - 1 
                    : endIdx;
                  
                  const segmentPath = routeGeometry.slice(startIdx, finalEndIdx + 1);
                  
                  if (segmentPath.length < 2) return null;
                  
                  return (
                    <Polyline
                      key={`route-${routeIdx}-segment-${segIdx}`}
                      positions={segmentPath}
                      pathOptions={{
                        color: isSelected ? getLevelColor(segment.level) : '#9ca3af',
                        weight: isSelected ? 7 : 4,
                        opacity: isSelected ? 0.9 : 0.4,
                        dashArray: isRecommended && isSelected ? undefined : '10, 10'
                      }}
                      eventHandlers={{
                        click: () => setSelectedRouteIndex(routeIdx)
                      }}
                    >
                      <Popup>
                        <div className="road-popup">
                          {isRecommended && <h4>🏆 推薦路徑 - 區段 {segIdx + 1}</h4>}
                          {!isRecommended && <h4>替代路徑 {routeIdx + 1} - 區段 {segIdx + 1}</h4>}
                          <p><strong>安全等級:</strong> <span style={{ color: getLevelColor(segment.level) }}>{segment.label}</span></p>
                          <p><strong>安全分數:</strong> {segment.safety_score}</p>
                          <hr />
                          <p>📹 監視器: {segment.cctv_count}</p>
                          <p>🚇 捷運站: {segment.metro_count}</p>
                          <p>💡 路燈: {segment.streetlight_count}</p>
                          <p>👮 警察局: {segment.police_count}</p>
                          {segment.robbery_count > 0 && (
                            <p style={{ color: '#ef4444' }}>⚠️ 搶案記錄: {segment.robbery_count}</p>
                          )}
                        </div>
                      </Popup>
                    </Polyline>
                  );
                })}
              </div>
            );
          })}
          
          {/* 載入中提示 */}
          {routeLoading && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              zIndex: 1000,
              textAlign: 'center'
            }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '10px' }}>計算路徑中...</p>
            </div>
          )}
        </MapContainer>
      )}

      {activeTab === 'route' && allRoutes.length > 0 && (
        <div className="route-summary">
          <div className="legend">
            <h4>路徑顏色圖例</h4>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#22c55e' }}></span>
              <span>安全 (分數 ≥ 60)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#eab308' }}></span>
              <span>需注意 (分數 40-59)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
              <span>危險 (分數 &lt; 40)</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#9ca3af', height: '2px' }}></span>
              <span>其他路徑（點擊切換）</span>
            </div>
          </div>
          
          {/* 路徑選擇器 */}
          <div className="route-selector">
            <h4>選擇路徑</h4>
            <div className="route-options">
              {allRoutes.map((route, idx) => (
                <button
                  key={idx}
                  className={`route-option ${selectedRouteIndex === idx ? 'selected' : ''} ${route.is_recommended ? 'recommended' : ''}`}
                  onClick={() => setSelectedRouteIndex(idx)}
                >
                  <div className="route-option-header">
                    {route.is_recommended && <span className="badge">🏆 推薦</span>}
                    {!route.is_recommended && <span className="badge-alt">路徑 {idx + 1}</span>}
                  </div>
                  <div className="route-option-stats">
                    <span className="route-distance">📍 {(route.distance_m / 1000).toFixed(2)} km</span>
                    <span className="route-duration">⏱️ {Math.round(route.duration_s / 60)} 分鐘</span>
                  </div>
                  <div className="route-option-safety">
                    <span 
                      className="safety-badge" 
                      style={{ backgroundColor: getLevelColor(route.summary.level) }}
                    >
                      {route.summary.label}
                    </span>
                    <span className="safety-score">分數: {route.summary.overall_score}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* 選中路徑的詳細資訊 */}
          {allRoutes[selectedRouteIndex] && (
            <div className="summary-card">
              <h3>
                {allRoutes[selectedRouteIndex].is_recommended ? '🏆 推薦路徑' : `路徑 ${selectedRouteIndex + 1}`}
              </h3>
              <div className="summary-badge" style={{ backgroundColor: getLevelColor(allRoutes[selectedRouteIndex].summary.level) }}>
                {allRoutes[selectedRouteIndex].summary.label}
              </div>
              <div className="summary-stats">
                <div className="stat">
                  <span className="stat-label">安全分數</span>
                  <span className="stat-value">{allRoutes[selectedRouteIndex].summary.overall_score}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">距離</span>
                  <span className="stat-value">{(allRoutes[selectedRouteIndex].distance_m / 1000).toFixed(2)} km</span>
                </div>
                <div className="stat">
                  <span className="stat-label">時間</span>
                  <span className="stat-value">{Math.round(allRoutes[selectedRouteIndex].duration_s / 60)} 分</span>
                </div>
                <div className="stat">
                  <span className="stat-label">監視器</span>
                  <span className="stat-value">{allRoutes[selectedRouteIndex].summary.total_cctv}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">捷運站</span>
                  <span className="stat-value">{allRoutes[selectedRouteIndex].summary.total_metro}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">路燈</span>
                  <span className="stat-value">{allRoutes[selectedRouteIndex].summary.total_streetlight}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">警察局</span>
                  <span className="stat-value">{allRoutes[selectedRouteIndex].summary.total_police}</span>
                </div>
                {allRoutes[selectedRouteIndex].summary.total_robbery > 0 && (
                  <div className="stat" style={{ color: '#ef4444' }}>
                    <span className="stat-label">⚠️ 搶案</span>
                    <span className="stat-value">{allRoutes[selectedRouteIndex].summary.total_robbery}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 路段詳情 */}
          {allRoutes[selectedRouteIndex] && allRoutes[selectedRouteIndex].segments.length > 0 && (
            <div className="segments-detail">
              <h4>各路段安全狀況</h4>
              <div className="segments-list">
                {allRoutes[selectedRouteIndex].segments.map((segment: RouteSegment, idx: number) => (
                  <div key={idx} className="segment-item">
                    <div className="segment-header">
                      <span className="segment-number">區段 {idx + 1}</span>
                      <span 
                        className="segment-badge" 
                        style={{ backgroundColor: getLevelColor(segment.level) }}
                      >
                        {segment.label}
                      </span>
                      <span className="segment-score">分數: {segment.safety_score}</span>
                    </div>
                    <div className="segment-details">
                      <span>📹 {segment.cctv_count}</span>
                      <span>🚇 {segment.metro_count}</span>
                      <span>💡 {segment.streetlight_count}</span>
                      <span>👮 {segment.police_count}</span>
                      {segment.robbery_count > 0 && (
                        <span style={{ color: '#ef4444' }}>⚠️ {segment.robbery_count}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <footer className="footer">
        <p>資料來源: 台北市政府開放資料 | 地圖: OpenStreetMap</p>
        <p>安全分數計算: 監視器 × 1 + 捷運站 × 5</p>
      </footer>
    </div>
  );
}

export default App;
