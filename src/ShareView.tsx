import { useEffect, useState } from 'react';
import { MapView } from './components/MapView';
import { useParams } from 'react-router-dom';

interface ShareData {
  lat: number;
  lng: number;
}

// 加上 props
interface ShareViewProps {
  readOnly?: boolean;
}

export default function ShareView({ readOnly }: ShareViewProps) {
  const { id } = useParams<{ id: string }>();
  const [center, setCenter] = useState<[number, number] | null>(null);

  /*
  useEffect(() => {
    async function fetchData() {
      try {
        // 從後端拿使用者位置
        const res = await fetch(`/api/share/${id}`);
        const data: ShareData = await res.json();
        setCenter([data.lat, data.lng]);
      } catch (e) {
        console.error('取得共享位置失敗', e);
      }
    }

    fetchData();

    // 可選：訂閱 WebSocket / Firebase，讓地圖即時更新
  }, [id]);

  */

  useEffect(() => {
  // 暫時用假資料，不呼叫後端
  setCenter([25.038420, 121.533626]);
}, []);

  if (!center) return <div>載入中...</div>;

  return (
    <div className="h-screen w-screen">
      <MapView
        safetyPlaces={[]}
        center={center}
        markers={[]} 
        showCurrentPosition={true}
        // 如果 MapView 也支援 readOnly，可以傳下去
        readOnly={readOnly} 
      />
    </div>
  );
}
