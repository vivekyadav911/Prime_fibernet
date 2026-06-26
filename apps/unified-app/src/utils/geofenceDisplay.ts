import type { Coordinates, Geofence } from '@/types/attendance';
import { formatCoordinatePair } from '@/utils/coordinates';

export function formatCoordinatesFallback(center: Coordinates): string {
  const { latitude, longitude } = formatCoordinatePair(center, 5);
  return `${latitude}, ${longitude}`;
}

/** Display address with lat/lng fallback when geocoding did not populate fields. */
export function formatGeofenceAddress(
  geofence: Pick<Geofence, 'address' | 'city' | 'state' | 'geometry'>,
): string {
  const parts = [geofence.address, geofence.city, geofence.state]
    .map((part) => part?.trim())
    .filter(Boolean);

  if (parts.length > 0) {
    return parts.join(', ');
  }

  if (geofence.geometry.shape === 'circle') {
    return formatCoordinatesFallback(geofence.geometry.center);
  }

  if (geofence.geometry.vertices.length > 0) {
    return formatCoordinatesFallback(geofence.geometry.vertices[0]!);
  }

  return 'No address set';
}

/** Resolve address fields for persistence when reverse geocoding fails. */
export function resolveGeofenceAddressFields(
  address: string,
  city: string,
  state: string,
  center: Coordinates,
): { address: string; city: string; state: string } {
  const trimmedAddress = address.trim();
  const trimmedCity = city.trim();
  const trimmedState = state.trim();

  if (trimmedAddress) {
    return { address: trimmedAddress, city: trimmedCity, state: trimmedState };
  }

  const coordLabel = formatCoordinatesFallback(center);
  return {
    address: coordLabel,
    city: trimmedCity,
    state: trimmedState,
  };
}
