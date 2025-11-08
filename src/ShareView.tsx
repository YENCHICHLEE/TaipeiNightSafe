import { useEffect, useState } from 'react';
import { MapView } from './components/MapView';
import { useParams } from 'react-router-dom';

interface ShareData {
  lat: number;
  lng: number;
}

export default function ShareView() {
  const { id } = useParams<{ id: string }>();
  const [center, setCenter] = useState<[number, number] | null>(null);

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

  if (!center) return <div>載入中...</div>;

  return (
    <div className="h-screen w-screen">
      <MapView center={center} markers={[]} showCurrentPosition={true} />
    </div>
  );
}
