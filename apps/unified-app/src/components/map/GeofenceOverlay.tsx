import { Circle, Polygon } from 'react-native-maps';

import type { Geofence } from '@/types/attendance';

type Props = {
  fence: Geofence;
};

export function GeofenceOverlay({ fence }: Props) {
  const color = '#4F46E580';
  const stroke = '#4F46E5';

  if (fence.geometry.shape === 'circle') {
    return (
      <Circle
        center={{
          latitude: fence.geometry.center.latitude,
          longitude: fence.geometry.center.longitude,
        }}
        radius={fence.geometry.radius}
        fillColor={color}
        strokeColor={stroke}
        strokeWidth={2}
      />
    );
  }

  const coords = fence.geometry.vertices.map((v) => ({
    latitude: v.latitude,
    longitude: v.longitude,
  }));

  return (
    <Polygon
      coordinates={coords}
      fillColor={color}
      strokeColor={stroke}
      strokeWidth={2}
    />
  );
}
