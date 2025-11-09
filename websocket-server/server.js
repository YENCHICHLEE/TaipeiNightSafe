import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

console.log('🚀 WebSocket 服務器啟動在 ws://localhost:8080');

wss.on('connection', (ws) => {
  console.log('✅ 新客戶端連接');

  ws.on('message', (data) => {
    const message = data.toString();
    console.log('📡 收到訊息:', message);

    // 廣播給所有其他客戶端
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === 1) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('❌ 客戶端斷開連接');
  });
});
