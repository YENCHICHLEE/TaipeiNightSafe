/**
 * Flutter Bridge - Web 與 Flutter App 的通訊橋接
 */

interface FlutterMessage {
  name: string;
  data: any;
}

/**
 * 檢查是否在 Flutter WebView 環境中
 */
export function isFlutterEnvironment(): boolean {
  return typeof (window as any).flutterObject !== 'undefined';
}

/**
 * 發送訊息給 Flutter
 */
export function sendToFlutter(message: FlutterMessage): boolean {
  if (!isFlutterEnvironment()) {
    console.warn('⚠️ Flutter 環境未偵測到，無法發送訊息');
    return false;
  }

  try {
    (window as any).flutterObject.postMessage(JSON.stringify(message));
    console.log('✅ 已發送訊息給 Flutter:', message);
    return true;
  } catch (error) {
    console.error('❌ 發送訊息給 Flutter 失敗:', error);
    return false;
  }
}

/**
 * 開啟新的 WebView 頁面
 */
export function openNewPage(url: string, title?: string): boolean {
  return sendToFlutter({
    name: 'open_new_page',
    data: {
      url,
      title,
    },
  });
}

/**
 * 發送通知給 Flutter
 */
export function sendNotification(title: string, content: string): boolean {
  return sendToFlutter({
    name: 'notify',
    data: {
      title,
      content,
    },
  });
}

/**
 * 撥打電話
 */
export function makePhoneCall(phoneNumber: string): boolean {
  return sendToFlutter({
    name: 'phone_call',
    data: phoneNumber,
  });
}

/**
 * 取得使用者位置
 */
export function getLocation(): boolean {
  return sendToFlutter({
    name: 'location',
    data: null,
  });
}
