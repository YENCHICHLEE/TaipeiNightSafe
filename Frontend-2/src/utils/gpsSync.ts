// GPS 同步工具 - 接收端
export class GPSSyncReceiver {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private onLocationUpdate: ((data: any) => void) | null = null;

  connect(onLocationUpdate: (data: any) => void) {
    this.onLocationUpdate = onLocationUpdate;

    try {
      this.ws = new WebSocket('ws://localhost:8080');

      this.ws.onopen = () => {
        console.log('🔗 GPS 同步已連接（接收模式）');
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'location_update' && this.onLocationUpdate) {
            console.log('📍 收到位置更新:', message.data);
            this.onLocationUpdate(message.data);
          }
        } catch (error) {
          console.error('❌ 解析訊息失敗:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 GPS 同步斷開，5秒後重連...');
        this.reconnectTimer = window.setTimeout(() => {
          if (this.onLocationUpdate) {
            this.connect(this.onLocationUpdate);
          }
        }, 5000);
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket 錯誤:', error);
      };
    } catch (error) {
      console.error('❌ 連接失敗:', error);
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
