import { z } from 'zod';

import type { Coordinates } from '@/types/attendance';

const latitudeSchema = z.number().min(-90).max(90);
const longitudeSchema = z.number().min(-180).max(180);

const coordinatePairSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
});

export type ParsedCoordinates = z.infer<typeof coordinatePairSchema>;

export type ParseCoordinateResult =
  | { ok: true; coordinates: ParsedCoordinates }
  | { ok: false; error: string };

const COORD_PAIR_REGEX =
  /^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/;

function parseNumeric(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

function validatePair(latitude: number, longitude: number): ParseCoordinateResult {
  const result = coordinatePairSchema.safeParse({ latitude, longitude });
  if (!result.success) {
    const issue = result.error.issues[0];
    return { ok: false, error: issue?.message ?? 'Invalid coordinates' };
  }
  return { ok: true, coordinates: result.data };
}

/**
 * Parse a coordinate pair from a combined string or separate lat/lng values.
 * Accepts formats like "28.6139, 77.209" or "28.6139 77.209".
 */
export function parseCoordinatePair(
  input: string,
  longitudeInput?: string,
): ParseCoordinateResult {
  const trimmed = input.trim();
  const lngTrimmed = longitudeInput?.trim() ?? '';

  if (lngTrimmed) {
    const lat = parseNumeric(trimmed);
    const lng = parseNumeric(lngTrimmed);
    if (lat == null) return { ok: false, error: 'Latitude must be a valid number' };
    if (lng == null) return { ok: false, error: 'Longitude must be a valid number' };
    return validatePair(lat, lng);
  }

  const match = trimmed.match(COORD_PAIR_REGEX);
  if (match) {
    const lat = parseNumeric(match[1] ?? '');
    const lng = parseNumeric(match[2] ?? '');
    if (lat == null || lng == null) {
      return { ok: false, error: 'Could not parse coordinate pair' };
    }
    return validatePair(lat, lng);
  }

  const lat = parseNumeric(trimmed);
  if (lat == null) {
    return { ok: false, error: 'Enter latitude and longitude, or paste "lat, lng"' };
  }
  return { ok: false, error: 'Longitude is required' };
}

export function formatCoordinatePair(center: Coordinates, decimals = 6): {
  latitude: string;
  longitude: string;
} {
  return {
    latitude: center.latitude.toFixed(decimals),
    longitude: center.longitude.toFixed(decimals),
  };
}

export function coordinatesEqual(a: Coordinates, b: Coordinates, epsilon = 1e-6): boolean {
  return (
    Math.abs(a.latitude - b.latitude) < epsilon &&
    Math.abs(a.longitude - b.longitude) < epsilon
  );
}
