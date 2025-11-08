# 🛡️ 道路安全地圖 - 前端應用

這是一個 React 應用，用於顯示台北市道路的安全評分，基於監視器和捷運站的分布。

## 功能特色

- 📍 顯示指定區域內的所有道路
- 🎨 根據安全分數用不同顏色標示道路（紅/黃/綠）
- 📊 顯示區域安全統計資訊
- 🗺️ 互動式地圖（可縮放、拖曳、點擊查看詳情）
- 📱 響應式設計，支援手機和桌面

## 安全分數計算

- **監視器**: 每個 +1 分
- **捷運站**: 每個 +5 分

### 安全等級

- 🟢 **安全** (分數 ≥ 20)
- 🟡 **需注意** (分數 10-19)
- 🔴 **危險** (分數 < 10)

## 安裝與執行

### 前置需求

- Node.js 14+ 
- npm 或 yarn
- 後端 API 運行在 `http://localhost:5001`

### 安裝步驟

1. 安裝依賴套件：
```bash
npm install
```

2. 啟動開發伺服器：
```bash
npm start
```

3. 在瀏覽器開啟 `http://localhost:3000`

## 使用的技術

- **React**: 前端框架
- **React Leaflet**: 地圖顯示
- **Axios**: API 請求
- **Leaflet**: 開源地圖庫
- **OpenStreetMap**: 地圖資料來源

## API 端點

應用會調用以下後端 API：

```
GET /get_nearby_roads_safety?center_lat=25.033964&center_lng=121.564468
```

### 參數

- `center_lat`: 中心點緯度
- `center_lng`: 中心點經度
- `search_radius_m`: 搜尋半徑（預設 500m）
- `safety_radius_m`: 安全檢測半徑（預設 200m）

## 專案結構

```
road-safety-frontend/
├── public/
├── src/
│   ├── App.js          # 主要應用組件
│   ├── App.css         # 樣式文件
│   ├── index.js        # 入口文件
│   └── index.css       # 全域樣式
├── package.json
└── README.md
```

## 自訂設定

### 修改中心點

在 `App.js` 中修改：

```javascript
const [center] = useState({ lat: 25.033964, lng: 121.564468 });
```

### 修改搜尋半徑

```javascript
const searchRadius = 500;  // 搜尋道路的半徑
const safetyRadius = 200;  // 計算安全分數的半徑
```

### 修改顏色配置

在 `getColor` 函數中調整：

```javascript
const getColor = (score) => {
  if (score >= 20) return '#22c55e'; // 綠色
  if (score >= 10) return '#eab308'; // 黃色
  return '#ef4444'; // 紅色
};
```

## 建置生產版本

```bash
npm run build
```

建置完成後，檔案會在 `build/` 目錄中。

## 部署

可以部署到：

- **Vercel**: `vercel --prod`
- **Netlify**: 拖曳 `build/` 資料夾
- **GitHub Pages**: 使用 `gh-pages` 套件

## 疑難排解

### CORS 錯誤

確保後端 API 允許跨域請求，或使用 proxy 設定（已在 package.json 中配置）。

### 地圖不顯示

1. 檢查 Leaflet CSS 是否正確載入
2. 確認 `map-container` 有設定高度
3. 檢查瀏覽器控制台的錯誤訊息

### API 連線失敗

1. 確認後端服務運行在 `http://localhost:5001`
2. 檢查網路連線
3. 查看瀏覽器開發者工具的 Network 標籤

## 授權

MIT License

## 資料來源

- 台北市政府開放資料平台
- OpenStreetMap
