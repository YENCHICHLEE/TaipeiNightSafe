import { sendNotification } from '../utils/flutterBridge';

export function HelloWorld() {
  const handleSendMessage = () => {
    const success = sendNotification(
      '來自 Hello World',
      '你點擊了 Hello World 頁面的按鈕！'
    );
    
    if (success) {
      alert('訊息已發送給 Flutter！');
    } else {
      alert('Flutter 環境未偵測到，請在 App 中開啟此頁面');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center p-5">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
        <div className="text-6xl mb-5 animate-bounce">👋</div>
        <h1 className="text-5xl font-bold text-purple-600 mb-5">Hello World!</h1>
        <p className="text-gray-600 text-lg mb-8 leading-relaxed">
          歡迎來到新頁面！<br />
          這是一個透過 Flutter WebView 開啟的示範頁面。
        </p>
        <button
          onClick={handleSendMessage}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold py-4 px-10 rounded-full text-lg transition-all hover:shadow-lg hover:-translate-y-1 active:translate-y-0"
        >
          發送訊息給 Flutter
        </button>
      </div>
    </div>
  );
}
