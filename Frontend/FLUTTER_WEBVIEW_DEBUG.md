# Flutter WebView 通訊除錯指南

## 問題描述
在 simulator 中點擊右下角「開啟頁面」按鈕沒有反應，且 `flutter run` 沒有顯示 logs。

## 已實作的修正

### 1. 前端修改 (Frontend/src/App.tsx)
- ✅ 改用 `async/await` 等待 Flutter 回應
- ✅ 加入詳細的 console.log 除錯訊息
- ✅ 改用本地測試頁面 `/test-page.html`
- ✅ 加入環境檢測和錯誤處理

### 2. Flutter 端修改

#### tp_web_view.dart
- ✅ 加入 `onConsoleMessage` 處理器，將 WebView 的 console 訊息印到 Flutter console
- ✅ 加入 WebMessageListener 註冊確認訊息
- ✅ 確保 `initialSettings` 啟用 JavaScript

#### tp_web_message_listener.dart
- ✅ 加入詳細的訊息接收 log
- ✅ 加入訊息解析錯誤處理
- ✅ 加入 handler 匹配確認訊息

#### tp_web_message_handler.dart (OpenNewPageMessageHandler)
- ✅ 加入訊息接收確認 log
- ✅ 加入訊息類型檢查 log
- ✅ 加入 URL 和標題的 log
- ✅ 加入頁面開啟成功確認 log

## 測試步驟

### 1. 重新編譯並執行 Flutter App
```bash
cd APP
flutter clean
flutter pub get
flutter run
```

### 2. 啟動前端開發伺服器
```bash
cd Frontend
npm run dev
```

### 3. 在 Flutter App 中測試
1. 開啟 App 並導航到包含 WebView 的頁面
2. 點擊右下角藍色的「開啟頁面」按鈕
3. 觀察 Flutter console 的輸出

## 預期的 Console 輸出

### 成功的情況下，你應該看到：

#### Flutter Console:
```
[TPWebView] WebMessageListener 已註冊: flutterObject
[WebView Console] LOG: 🎯 App 已載入，等待測試 Flutter 通訊
[WebView Console] LOG: 💡 提示：點擊右下角藍色「開啟頁面」按鈕測試
[WebView Console] LOG: 🔵 開啟新頁面按鈕被點擊
[WebView Console] LOG: 🔍 檢查環境: {...}
[WebView Console] LOG: 📤 準備發送訊息: {...}
[WebMessageListener] 收到訊息
[WebMessageListener] 原始訊息: {"name":"open_new_page","data":{"url":"...","title":"測試頁面"}}
[WebMessageListener] 解析後的訊息: {name: open_new_page, data: {...}}
[WebMessageListener] 訊息名稱: open_new_page
[WebMessageListener] 找到對應的 handler: open_new_page
[OpenNewPageHandler] 收到訊息: {url: ..., title: 測試頁面}
[OpenNewPageHandler] 訊息類型: _Map<String, dynamic>
[OpenNewPageHandler] 準備開啟 URL: ...
[OpenNewPageHandler] 標題: 測試頁面
[OpenNewPageHandler] 頁面已開啟
[WebMessageListener] 發送回應: true
[WebView Console] LOG: ✅ Flutter 回應: true
```

#### Browser Console (WebView):
```
🎯 App 已載入，等待測試 Flutter 通訊
💡 提示：點擊右下角藍色「開啟頁面」按鈕測試
🔵 開啟新頁面按鈕被點擊
🔍 檢查環境: {hasFlutterObject: true, ...}
📤 準備發送訊息: {"name":"open_new_page","data":{...}}
✅ Flutter 回應: true
```

## 常見問題排查

### 問題 1: 看不到任何 Flutter Console 輸出
**可能原因：**
- Flutter console 被過濾了
- 需要在 IDE 中啟用所有 log 級別

**解決方法：**
```bash
# 使用 verbose 模式執行
flutter run -v
```

### 問題 2: 看到 "Flutter 環境未偵測到"
**可能原因：**
- WebMessageListener 沒有正確註冊
- WebView 還沒完全載入

**解決方法：**
- 檢查 Flutter console 是否有 "[TPWebView] WebMessageListener 已註冊" 訊息
- 等待頁面完全載入後再點擊按鈕

### 問題 3: 訊息發送但沒有回應
**可能原因：**
- 訊息格式不正確
- Handler 沒有正確處理訊息

**解決方法：**
- 檢查 Flutter console 的 [WebMessageListener] 訊息
- 確認訊息格式符合預期

### 問題 4: 頁面沒有開啟
**可能原因：**
- URL 格式錯誤
- 網路連線問題

**解決方法：**
- 檢查 [OpenNewPageHandler] 的 log
- 確認 URL 是否正確

## 測試頁面
已建立測試頁面：`Frontend/public/test-page.html`

這個頁面會顯示：
- ✅ 成功圖示
- 頁面載入時間
- 確認訊息

## 下一步
如果所有測試都通過，你可以：
1. 將測試頁面 URL 改為實際要開啟的頁面
2. 移除多餘的 debug log（保留關鍵的即可）
3. 實作其他按鈕的功能（最近店家、緊急報案）

## 相關檔案
- `Frontend/src/App.tsx` - 前端主程式
- `Frontend/public/test-page.html` - 測試頁面
- `APP/lib/util/tp_web_view.dart` - WebView 元件
- `APP/lib/util/web_message_handler/tp_web_message_listener.dart` - 訊息監聽器
- `APP/lib/util/web_message_handler/tp_web_message_handler.dart` - 訊息處理器
