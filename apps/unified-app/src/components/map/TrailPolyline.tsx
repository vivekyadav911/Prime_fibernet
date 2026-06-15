import { useMemo } from 'react';
import { Polyline } from 'react-native-maps';

import { getTrailColorForSpeed } from '@/constants/mapTheme';
import type { LocationHistoryPoint } from '@/types/map';

type Props = {
  officerId: string;
  points: LocationHistoryPoint[];
};

type Segment = {
  coordinates: Array<{ latitude: number; longitude: number }>;
  color: string;
  dashed: boolean;
};

function buildSegments(points: LocationHistoryPoint[]): Segment[] {
  if (points.length < 2) return [];

  const segments: Segment[] = [];
  let current: Segment | null = null;

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const color = getTrailColorForSpeed(curr.speed);
    const dashed = (curr.speed ?? 0) < 0.5;
    const coord = { latitude: curr.latitude, longitude: curr.longitude };

    if (
      current &&
      current.color === color &&
      current.dashed === dashed
    ) {
      current.coordinates.push(coord);
    } else {
      if (current) segments.push(current);
      current = {
        color,
        dashed,
        coordinates: [
          { latitude: prev.latitude, longitude: prev.longitude },
          coord,
        ],
      };
    }
  }

  if (current) segments.push(current);
  return segments;
}

export function TrailPolyline({ officerId, points }: Props) {
  const segments = useMemo(() => buildSegments(points), [points]);

  return (
    <>
      {segments.map((seg, idx) => (
        <Polyline
          key={`${officerId}-seg-${idx}`}
          coordinates={seg.coordinates}
          strokeColor={seg.color}
          strokeWidth={3}
          lineDashPattern={seg.dashed ? [5, 5] : undefined}
        />
      ))}
    </>
  );
}
