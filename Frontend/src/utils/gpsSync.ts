// GPS 同步工具 - 發送端
export class GPSSyncSender {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;

  connect() {
    try {
      this.ws = new WebSocket('ws://localhost:8080');

      this.ws.onopen = () => {
        console.log('🔗 GPS 同步已連接');
      };

      this.ws.onclose = () => {
        console.log('🔌 GPS 同步斷開，5秒後重連...');
        this.reconnectTimer = window.setTimeout(() => this.connect(), 5000);
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket 錯誤:', error);
      };
    } catch (error) {
      console.error('❌ 連接失敗:', error);
    }
  }

  sendLocation(lat: number, lng: number, roads?: any, safetyData?: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'location_update',
        data: {
          lat,
          lng,
          timestamp: Date.now(),
          roads,
          safetyData
        }
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
