# 修正持續呼叫 API 的問題

## 問題描述

前端在打開後會持續不斷地呼叫後端 API，即使沒有移動也會一直搜尋。

## 問題原因

在 `App.tsx` 的 `useEffect` 中，依賴陣列包含了 `mapCenter` 和 `safetyData`：

```typescript
useEffect(() => {
  // ...
  fetchRoadSafety(); // 每次 mapCenter 或 safetyData 改變都會執行
}, [mapCenter, safetyData, simulationInterval]); // ❌ 錯誤的依賴
```

這導致：
1. 初始載入時設定 `mapCenter` 和 `safetyData`
2. 這些狀態改變觸發 `useEffect` 重新執行
3. `fetchRoadSafety()` 再次被呼叫
4. 形成無限循環

## 解決方案

### 1. 修改 useEffect 依賴陣列

將依賴陣列改為空陣列 `[]`，確保只在組件掛載時執行一次：

```typescript
useEffect(() => {
  // 初始載入
  const loadInitialData = async () => {
    const data = await loadSafetyData(25.033964, 121.564468);
    setSafetyData(data);
    setMapCenter([data.meta.center.lat, data.meta.center.lng]);
    
    const roadData = await loadRoadSafetyData(25.033964, 121.564468);
    setRoadSafetyData(roadData);
  };
  
  loadInitialData();
  
  // 監聽 Flutter 訊息
  window.addEventListener('message', handleFlutterMessage);
  
  return () => {
    window.removeEventListener('message', handleFlutterMessage);
  };
}, []); // ✅ 空依賴陣列
```

### 2. 使用 useCallback 包裝函數

將 `updateLocationAndLoadData` 用 `useCallback` 包裝，避免每次渲染都創建新函數：

```typescript
const updateLocationAndLoadData = useCallback(async (
  lat: number, 
  lng: number, 
  forceReload: boolean = false
) => {
  // 檢查是否在已知路段內
  const withinKnownRoads = roadSafetyData?.roads 
    ? isWithinKnownRoads(lat, lng, roadSafetyData.roads, 30)
    : false;

  // 只在需要時呼叫 API
  if (!withinKnownRoads || forceReload) {
    // 重新載入資料
  } else {
    // 只更新位置
  }
}, [roadSafetyData]);
```

### 3. 簡化 Flutter 訊息處理

直接在 `useEffect` 中處理 Flutter 訊息，不使用外部的 `handleLocationEventAndLoad`：

```typescript
const handleFlutterMessage = (event: MessageEvent) => {
  try {
    const parsed = JSON.parse(event.data);
    if (parsed.name === 'location' && parsed.data) {
      const { latitude, longitude } = parsed.data;
      updateLocationAndLoadData(latitude, longitude, true);
    }
  } catch (err) {
    // 忽略非 JSON 訊息
  }
};
```

## 現在的行為

### ✅ 正確的 API 呼叫時機

1. **初始載入**：App 啟動時載入一次
2. **模擬移動**：
   - 在已知路段內：只更新位置，不呼叫 API
   - 離開已知路段：自動呼叫 API 載入新資料
3. **Flutter 位置更新**：收到 Flutter 位置時強制重新載入
4. **手動重新載入**：點擊「重新載入」按鈕時

### ❌ 不會觸發 API 的情況

- 組件重新渲染
- 狀態更新（mapCenter、safetyData 等）
- 在已知路段內移動

## 測試方法

### 1. 檢查初始載入
打開 App，應該只看到一次 API 呼叫：
```
🎯 App 已載入，開始載入安全資料
🌐 呼叫後端 API: http://127.0.0.1:5001/get_safety_data?...
✅ 安全資料載入成功
✅ 道路安全資料載入成功
```

### 2. 檢查靜止狀態
不進行任何操作，console 不應該有新的 API 呼叫。

### 3. 檢查模擬移動
點擊「模擬移動」：
- 在路段內：只顯示位置更新，無 API 呼叫
- 離開路段：顯示「重新載入資料」並呼叫 API

## 相關檔案

- `Frontend/src/App.tsx` - 主要修改
- `Frontend/src/utils/roadSegmentChecker.ts` - 路段檢測邏輯
- `Frontend/src/utils/safetyDataLoader.ts` - 安全資料載入
- `Frontend/src/utils/roadSafetyDataLoader.ts` - 道路安全資料載入
