# GPS 同步功能說明

## 功能概述

Frontend 和 Frontend-2 之間透過 WebSocket 實現即時 GPS 位置同步。Frontend 作為發送端，Frontend-2 作為接收端，可以即時看到對方的移動軌跡。

## 架構說明

```
Frontend (發送端)
    ↓ WebSocket
WebSocket Server (ws://localhost:8080)
    ↓ WebSocket
Frontend-2 (接收端)
```

## 啟動步驟

### 1. 啟動 WebSocket 服務器

```bash
cd websocket-server
npm install
npm start
```

服務器會在 `ws://localhost:8080` 啟動。

### 2. 啟動 Frontend (發送端)

```bash
cd Frontend
npm run dev
```

Frontend 會在 `http://localhost:5174` 啟動。

### 3. 啟動 Frontend-2 (接收端)

```bash
cd Frontend-2
npm run dev
```

Frontend-2 會在 `http://localhost:5173` 啟動（或其他可用端口）。

## 使用方式

### Frontend (發送端)

1. 開啟 `http://localhost:5174`
2. 點擊「模擬移動」按鈕開始移動
3. 位置會自動同步到 Frontend-2

### Frontend-2 (接收端)

1. 開啟 Frontend-2 的 URL
2. 會自動連接到 WebSocket 服務器
3. 即時顯示 Frontend 的位置和移動軌跡

## 同步的資料

- **位置座標** (lat, lng)
- **時間戳記** (timestamp)
- **道路資料** (roads) - 當重新載入時
- **安全資料** (safetyData) - 當重新載入時

## Console 訊息

### Frontend (發送端)
```
🔗 GPS 同步已連接
📍 位置更新: 25.033100, 121.565450 - 在 市府路 附近 (15.3m)
```

### Frontend-2 (接收端)
```
🔗 GPS 同步已連接（接收模式）
📍 收到位置同步: {lat: 25.033100, lng: 121.565450, ...}
```

### WebSocket 服務器
```
🚀 WebSocket 服務器啟動在 ws://localhost:8080
✅ 新客戶端連接
📡 收到訊息: {"type":"location_update",...}
```

## 自動重連機制

如果 WebSocket 連接斷開，客戶端會在 5 秒後自動重連。

## 技術細節

### 訊息格式

```typescript
{
  type: 'location_update',
  data: {
    lat: number,
    lng: number,
    timestamp: number,
    roads?: RoadSafetyData,
    safetyData?: SafetyAPIResponse
  }
}
```

### 相關檔案

**WebSocket 服務器:**
- `websocket-server/server.js` - WebSocket 服務器
- `websocket-server/package.json` - 依賴配置

**Frontend (發送端):**
- `Frontend/src/utils/gpsSync.ts` - GPS 同步發送工具
- `Frontend/src/App.tsx` - 整合 GPS 同步發送

**Frontend-2 (接收端):**
- `Frontend-2/src/utils/gpsSync.ts` - GPS 同步接收工具
- `Frontend-2/src/App.tsx` - 整合 GPS 同步接收

## 注意事項

1. 確保三個服務都在運行（WebSocket 服務器、Frontend、Frontend-2）
2. WebSocket 服務器必須先啟動
3. 如果連接失敗，檢查端口 8080 是否被佔用
4. 移動軌跡會累積在記憶體中，可以點擊「清除軌跡」按鈕清除

## 測試建議

1. 先啟動 WebSocket 服務器
2. 開啟 Frontend 和 Frontend-2 在不同的瀏覽器視窗
3. 在 Frontend 點擊「模擬移動」
4. 觀察 Frontend-2 是否同步顯示移動軌跡
5. 檢查兩邊的 Console 訊息確認連接狀態
