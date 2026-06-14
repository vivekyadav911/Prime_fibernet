import type {
  CircleGeofence,
  Coordinates,
  Geofence,
  PolygonGeofence,
} from '@/types/attendance';

const EARTH_RADIUS_M = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate distance in meters between two coordinates using Haversine formula.
 */
export function getDistanceMeters(pointA: Coordinates, pointB: Coordinates): number {
  const dLat = toRadians(pointB.latitude - pointA.latitude);
  const dLon = toRadians(pointB.longitude - pointA.longitude);
  const lat1 = toRadians(pointA.latitude);
  const lat2 = toRadians(pointB.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/**
 * Check if a point is inside a circle geofence.
 */
export function isInsideCircle(
  point: Coordinates,
  center: Coordinates,
  radiusMeters: number,
): boolean {
  if (radiusMeters <= 0) return false;
  return getDistanceMeters(point, center) <= radiusMeters;
}

/**
 * Check if a point is inside a polygon geofence using ray-casting.
 */
export function isInsidePolygon(point: Coordinates, vertices: Coordinates[]): boolean {
  if (vertices.length < 3) return false;

  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i, i += 1) {
    const vi = vertices[i];
    const vj = vertices[j];
    if (!vi || !vj) continue;
    const xi = vi.longitude;
    const yi = vi.latitude;
    const xj = vj.longitude;
    const yj = vj.latitude;

    const intersects =
      yi > point.latitude !== yj > point.latitude &&
      point.longitude <
        ((xj - xi) * (point.latitude - yi)) / (yj - yi + Number.EPSILON) + xi;

    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Master function — works for both circle and polygon shapes.
 */
export function isInsideGeofence(point: Coordinates, geofence: Geofence): boolean {
  const { geometry } = geofence;
  if (geometry.shape === 'circle') {
    return isInsideCircle(point, geometry.center, geometry.radius);
  }
  return isInsidePolygon(point, geometry.vertices);
}

/**
 * Get nearest geofence from a list and distance to it.
 */
export function getNearestGeofence(
  point: Coordinates,
  geofences: Geofence[],
): { geofence: Geofence; distance: number; isInside: boolean } | null {
  if (geofences.length === 0) return null;

  let best: { geofence: Geofence; distance: number; isInside: boolean } | null = null;

  for (const geofence of geofences) {
    const inside = isInsideGeofence(point, geofence);
    const distance = inside
      ? 0
      : getDistanceToGeofenceEdge(point, geofence);

    if (!best || distance < best.distance) {
      best = { geofence, distance, isInside: inside };
    }
  }

  return best;
}

function getDistanceToGeofenceEdge(point: Coordinates, geofence: Geofence): number {
  const { geometry } = geofence;
  if (geometry.shape === 'circle') {
    const distToCenter = getDistanceMeters(point, geometry.center);
    return Math.max(0, distToCenter - geometry.radius);
  }

  if (isInsidePolygon(point, geometry.vertices)) return 0;

  let minDist = Infinity;
  for (const vertex of geometry.vertices) {
    minDist = Math.min(minDist, getDistanceMeters(point, vertex));
  }
  return minDist;
}

/**
 * Generate a circle polygon for map rendering.
 */
export function circleToPolygon(
  center: Coordinates,
  radiusMeters: number,
  points = 64,
): Coordinates[] {
  const result: Coordinates[] = [];
  for (let i = 0; i < points; i += 1) {
    const angle = (2 * Math.PI * i) / points;
    const dx = radiusMeters * Math.cos(angle);
    const dy = radiusMeters * Math.sin(angle);
    const deltaLat = dy / EARTH_RADIUS_M;
    const deltaLon = dx / (EARTH_RADIUS_M * Math.cos(toRadians(center.latitude)));
    result.push({
      latitude: center.latitude + (deltaLat * 180) / Math.PI,
      longitude: center.longitude + (deltaLon * 180) / Math.PI,
    });
  }
  return result;
}

/**
 * Validate geofence geometry.
 */
export function validateGeofence(geometry: CircleGeofence | PolygonGeofence): {
  valid: boolean;
  error?: string;
} {
  if (geometry.shape === 'circle') {
    if (geometry.radius < 50) return { valid: false, error: 'Minimum radius is 50 meters' };
    if (geometry.radius > 50_000) return { valid: false, error: 'Maximum radius is 50 km' };
    return { valid: true };
  }

  if (geometry.vertices.length < 3) {
    return { valid: false, error: 'Polygon requires at least 3 vertices' };
  }
  return { valid: true };
}

/**
 * Check if point is inside ANY of the assigned geofences.
 */
export function checkGeofenceStatus(
  point: Coordinates,
  geofences: Geofence[],
): { isInside: boolean; geofence: Geofence | null; distance: number } {
  const nearest = getNearestGeofence(point, geofences);
  if (!nearest) return { isInside: false, geofence: null, distance: Infinity };

  const insideMatch = geofences.find((g) => isInsideGeofence(point, g));
  if (insideMatch) {
    const dist = getDistanceToGeofenceEdge(point, insideMatch);
    return { isInside: true, geofence: insideMatch, distance: dist };
  }

  return {
    isInside: false,
    geofence: nearest.geofence,
    distance: nearest.distance,
  };
}
