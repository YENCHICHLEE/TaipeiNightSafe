// ============================================
// 將此程式碼片段加入到 App.tsx 中
// ============================================

// 1. 在檔案頂部加入 import
import { openNewPage } from './utils/flutterBridge';

// 2. 在按鈕區域（<div className="fixed bottom-4 right-4 flex flex-col gap-3 z-[900]">）中
//    在「緊急報案」按鈕之後加入以下按鈕：

<button
  onClick={() => {
    console.log('開啟新頁面按鈕被點擊');
    
    // 使用工具函數開啟 Hello World 頁面
    const success = openNewPage(
      window.location.origin + '/hello-world.html',
      'Hello World'
    );
    
    if (!success) {
      console.warn('⚠️ Flutter 環境未偵測到，無法開啟新頁面');
      // 在瀏覽器中可以直接開啟
      window.open('/hello-world.html', '_blank');
    }
  }}
  className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold w-20 h-20 rounded-full transition-all shadow-lg hover:shadow-xl flex flex-col items-center justify-center"
>
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="28" 
    height="28" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className="mb-1"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
  <span className="text-xs">開啟頁面</span>
</button>

// ============================================
// 完整的按鈕區域範例（包含所有按鈕）
// ============================================

<div className="fixed bottom-4 right-4 flex flex-col gap-3 z-[900]">
  {/* 最近店家按鈕 */}
  <button
    onClick={() => {
      console.log('最近店家按鈕被點擊');
    }}
    className="bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 font-semibold w-20 h-20 rounded-full transition-all shadow-lg hover:shadow-xl flex flex-col items-center justify-center border-2 border-gray-300"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
    <span className="text-xs">最近店家</span>
  </button>

  {/* 緊急報案按鈕 */}
  <button
    onClick={() => {
      console.log('緊急報案按鈕被點擊');
    }}
    className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold w-20 h-20 rounded-full transition-all shadow-lg hover:shadow-xl flex flex-col items-center justify-center"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
    <span className="text-xs">緊急報案</span>
  </button>

  {/* 開啟新頁面按鈕 - 新增 */}
  <button
    onClick={() => {
      console.log('開啟新頁面按鈕被點擊');
      const success = openNewPage(
        window.location.origin + '/hello-world.html',
        'Hello World'
      );
      if (!success) {
        console.warn('⚠️ Flutter 環境未偵測到');
        window.open('/hello-world.html', '_blank');
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

  {/* 測試載入按鈕（原本就有的，保持隱藏） */}
  <button
    onClick={async () => {
      try {
        const data = await loadSafetyData(25.033964, 121.564468);
        setSafetyData(data);
        setMapCenter([data.meta.center.lat, data.meta.center.lng]);
      } catch (error) {
        console.error('測試載入失敗：', error);
      }
    }}
    className="hidden bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white font-semibold py-3 px-5 rounded-full transition-all text-sm shadow-lg hover:shadow-xl whitespace-nowrap"
  >
    測試載入
  </button>
</div>
