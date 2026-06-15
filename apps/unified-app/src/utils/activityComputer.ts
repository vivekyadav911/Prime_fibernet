import type { ActivityStats, LocationHistoryPoint } from '@/types/map';

import { haversineMetres, msToKmh } from '@/utils/geoUtils';

const EMPTY_STATS: ActivityStats = {
  distance_km: 0,
  time_active_minutes: 0,
  stops: 0,
  avg_speed_kmh: 0,
  max_speed_kmh: 0,
  first_ping_at: null,
  last_ping_at: null,
};

export function computeActivityStats(points: LocationHistoryPoint[]): ActivityStats {
  if (points.length < 2) {
    return {
      ...EMPTY_STATS,
      first_ping_at: points[0]?.recorded_at ?? null,
      last_ping_at: points[0]?.recorded_at ?? null,
    };
  }

  let totalDistanceM = 0;
  let activeSeconds = 0;
  let stops = 0;
  const speeds: number[] = [];

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]!;
    const curr = points[i]!;

    totalDistanceM += haversineMetres(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude,
    );

    const intervalSeconds =
      (new Date(curr.recorded_at).getTime() - new Date(prev.recorded_at).getTime()) / 1000;

    if (curr.is_moving) {
      activeSeconds += intervalSeconds;
    } else if (prev.is_moving && !curr.is_moving) {
      stops += 1;
    }

    if (curr.speed !== null) {
      speeds.push(msToKmh(curr.speed));
    }
  }

  const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;

  return {
    distance_km: +(totalDistanceM / 1000).toFixed(2),
    time_active_minutes: Math.round(activeSeconds / 60),
    stops,
    avg_speed_kmh: +avgSpeed.toFixed(1),
    max_speed_kmh: +maxSpeed.toFixed(1),
    first_ping_at: points[0]!.recorded_at,
    last_ping_at: points[points.length - 1]!.recorded_at,
  };
}

/** Minutes active per hour (0–23) for breakdown chart */
export function computeHourlyBreakdown(
  points: LocationHistoryPoint[],
): Array<{ hour: number; minutes: number }> {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, minutes: 0 }));

  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    if (!curr.is_moving) continue;

    const intervalMinutes =
      (new Date(curr.recorded_at).getTime() - new Date(prev.recorded_at).getTime()) / 60000;
    const hour = new Date(curr.recorded_at).getHours();
    buckets[hour]!.minutes += intervalMinutes;
  }

  return buckets.map((b) => ({ hour: b.hour, minutes: Math.round(b.minutes) }));
}
