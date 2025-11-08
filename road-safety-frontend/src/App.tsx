import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Popup, Circle } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import './App.css';
import type { Road, Summary, RoadSafetyResponse } from './types';

function App() {
  const [roads, setRoads] = useState<Road[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  
  // 預設中心點（台北市政府附近）
  const [center] = useState({ lat: 25.033964, lng: 121.564468 });
  const searchRadius = 500;
  const safetyRadius = 200;

  useEffect(() => {
    fetchRoadSafety();
  }, []);

  const fetchRoadSafety = async () => {
    try {
      setLoading(true);
      const response = await axios.get<RoadSafetyResponse>('http://localhost:5001/get_nearby_roads_safety', {
        params: {
          center_lat: center.lat,
          center_lng: center.lng,
          search_radius_m: searchRadius,
          safety_radius_m: safetyRadius
        }
      });
      
      setRoads(response.data.roads);
      setSummary(response.data.summary);
      setError(null);
    } catch (err) {
      setError('無法載入道路安全資料: ' + (err instanceof Error ? err.message : String(err)));
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 根據安全分數返回顏色 (0-100 scale)
  const getColor = (score: number): string => {
    if (score >= 60) return '#22c55e'; // 綠色 - 安全
    if (score >= 40) return '#eab308'; // 黃色 - 需注意
    return '#ef4444'; // 紅色 - 危險
  };

  // 根據等級返回顏色
  const getLevelColor = (level: number): string => {
    if (level === 3) return '#22c55e'; // 安全
    if (level === 2) return '#eab308'; // 需注意
    return '#ef4444'; // 危險
  };

  return (
    <div className="App">
      <header className="header">
        <h1>🛡️ 道路安全地圖</h1>
        <p>顯示台北市道路安全評分（基於監視器與捷運站分布）</p>
      </header>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>載入中...</p>
        </div>
      )}

      {error && (
        <div className="error">
          <p>❌ {error}</p>
          <button onClick={fetchRoadSafety}>重試</button>
        </div>
      )}

      {summary && (
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
      )}

      {!loading && !error && (
        <MapContainer 
          center={[center.lat, center.lng]} 
          zoom={15} 
          className="map-container"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* 中心點標記 */}
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

          {/* 繪製所有道路 */}
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
      )}

      <footer className="footer">
        <p>資料來源: 台北市政府開放資料 | 地圖: OpenStreetMap</p>
        <p>安全分數計算: 監視器 × 1 + 捷運站 × 5</p>
      </footer>
    </div>
  );
}

export default App;
