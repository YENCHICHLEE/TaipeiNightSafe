# Flutter WebView 整合說明

## 概述

本專案已整合 Flutter WebView 雙向通訊功能，可以從 Web 端呼叫 Flutter 原生功能。

## 已實作功能

### 1. Flutter 端 (APP/)

已在 Flutter 專案中新增 `OpenNewPageMessageHandler`，用於處理從 Web 端發送的開啟新頁面請求。

**檔案位置：**
- `APP/lib/util/web_message_handler/tp_web_message_handler.dart`
- `APP/lib/util/web_message_handler/tp_web_message_listener.dart`

**Handler 功能：**
```dart
class OpenNewPageMessageHandler extends TPWebMessageHandler {
  @override
  String get name => 'open_new_page';

  @override
  Future<void> handle({...}) async {
    // 接收 Web 端傳來的 URL 和標題
    // 使用 Flutter 的 WebView 開啟新頁面
  }
}
```

### 2. Web 端 (Frontend/)

#### 工具函數
已建立 `flutterBridge.ts` 提供便捷的 Flutter 通訊方法：

**檔案位置：** `Frontend/src/utils/flutterBridge.ts`

**可用函數：**
```typescript
// 檢查是否在 Flutter 環境
isFlutterEnvironment(): boolean

// 開啟新的 WebView 頁面
openNewPage(url: string, title?: string): boolean

// 發送通知
sendNotification(title: string, content: string): boolean

// 撥打電話
makePhoneCall(phoneNumber: string): boolean

// 取得位置
getLocation(): boolean
```

#### Hello World 示範頁面
已建立獨立的 HTML 頁面作為示範：

**檔案位置：** `Frontend/public/hello-world.html`

**功能：**
- 自動檢測 Flutter 環境
- 發送訊息給 Flutter
- 開啟另一個 WebView 頁面
- 美觀的動畫效果

## 在 App.tsx 中新增按鈕

在 `Frontend/src/App.tsx` 的按鈕區域新增以下程式碼：

```tsx
import { openNewPage } from './utils/flutterBridge';

// 在按鈕區域新增
<button
  onClick={() => {
    console.log('開啟新頁面按鈕被點擊');
    const success = openNewPage(
      window.location.origin + '/hello-world.html',
      'Hello World'
    );
    
    if (!success) {
      console.warn('⚠️ Flutter 環境未偵測到');
    }
  }}
  className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold w-20 h-20 rounded-full transition-all shadow-lg hover:shadow-xl flex flex-col items-center justify-center"
>
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
  <span className="text-xs">開啟頁面</span>
</button>
```

## 使用方式

### 方法 1：使用工具函數（推薦）

```typescript
import { openNewPage, sendNotification } from './utils/flutterBridge';

// 開啟新頁面
openNewPage('https://example.com', '頁面標題');

// 發送通知
sendNotification('標題', '內容');
```

### 方法 2：直接使用 flutterObject

```typescript
const message = {
  name: 'open_new_page',
  data: {
    url: 'https://example.com',
    title: '頁面標題'
  }
};

if ((window as any).flutterObject) {
  (window as any).flutterObject.postMessage(JSON.stringify(message));
}
```

## 可用的 Message Handler

Flutter 端已註冊以下 handlers：

1. **userinfo** - 取得使用者資訊
2. **launch_map** - 開啟地圖
3. **phone_call** - 撥打電話
4. **1999agree** - 撥打 1999
5. **location** - 取得位置
6. **deviceinfo** - 取得裝置資訊
7. **open_link** - 開啟連結
8. **notify** - 發送通知
9. **qr_code_scan** - 掃描 QR Code
10. **open_new_page** - 開啟新的 WebView 頁面 ✨ (新增)

## 測試

### 在瀏覽器中測試
直接訪問 `http://localhost:5173/hello-world.html`，會顯示「瀏覽器環境」狀態。

### 在 Flutter App 中測試
1. 在 Flutter App 中開啟主頁面
2. 點擊「開啟頁面」按鈕
3. 會開啟 Hello World 頁面，顯示「Flutter App 環境」狀態
4. 可以測試發送訊息和開啟新頁面功能

## 注意事項

1. 所有與 Flutter 的通訊都是非同步的
2. 在非 Flutter 環境中，`flutterObject` 會是 `undefined`
3. 建議使用 `isFlutterEnvironment()` 檢查環境後再呼叫 Flutter 功能
4. URL 可以是相對路徑或絕對路徑
5. 開啟的新頁面也會自動註冊 `flutterObject`，可以繼續與 Flutter 通訊

## 開發建議

1. 使用 `flutterBridge.ts` 中的工具函數，避免重複程式碼
2. 在開發時可以使用 `console.log` 追蹤訊息傳遞
3. 為不同的功能建立專門的 handler，保持程式碼清晰
4. 在 Web 端做好錯誤處理，提供友善的使用者體驗
