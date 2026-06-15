import type { LocationHistoryPoint } from '@/types/map';

export { getDistanceMeters } from '@/utils/geofenceUtils';
import { getDistanceMeters } from '@/utils/geofenceUtils';

export function haversineMetres(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  return getDistanceMeters(
    { latitude: lat1, longitude: lon1 },
    { latitude: lat2, longitude: lon2 },
  );
}

export function msToKmh(speedMs: number | null): number {
  if (speedMs === null) return 0;
  return speedMs * 3.6;
}

export function bearingDegrees(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function perpendicularDistance(
  point: { latitude: number; longitude: number },
  lineStart: { latitude: number; longitude: number },
  lineEnd: { latitude: number; longitude: number },
): number {
  const dx = lineEnd.longitude - lineStart.longitude;
  const dy = lineEnd.latitude - lineStart.latitude;
  if (dx === 0 && dy === 0) {
    return haversineMetres(point.latitude, point.longitude, lineStart.latitude, lineStart.longitude);
  }
  const t =
    ((point.longitude - lineStart.longitude) * dx + (point.latitude - lineStart.latitude) * dy) /
    (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  const projLat = lineStart.latitude + clamped * dy;
  const projLng = lineStart.longitude + clamped * dx;
  return haversineMetres(point.latitude, point.longitude, projLat, projLng);
}

/** Douglas-Peucker simplification for map trail performance */
export function simplifyTrail<T extends { latitude: number; longitude: number }>(
  points: T[],
  toleranceMetres = 15,
): T[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i += 1) {
    const dist = perpendicularDistance(points[i]!, points[0]!, points[end]!);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > toleranceMetres) {
    const left = simplifyTrail(points.slice(0, index + 1), toleranceMetres);
    const right = simplifyTrail(points.slice(index), toleranceMetres);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0]!, points[end]!];
}

export function thinHistoryPoints(
  points: LocationHistoryPoint[],
  maxPoints = 5000,
): LocationHistoryPoint[] {
  if (points.length <= maxPoints) {
    return simplifyTrail(points, 12);
  }
  const step = Math.ceil(points.length / maxPoints);
  const sampled = points.filter((_, i) => i % step === 0 || i === points.length - 1);
  return simplifyTrail(sampled, 12);
}
