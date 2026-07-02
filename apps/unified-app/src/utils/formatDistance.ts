/**
 * Format a distance in meters for user-facing copy.
 * Never renders Infinity/NaN — returns null when distance is unknown.
 */
export function formatDistanceMeters(
  meters: number | null | undefined,
  options?: { suffix?: string; includeSuffix?: boolean },
): string | null {
  if (meters == null || !Number.isFinite(meters) || meters < 0) {
    return null;
  }

  const suffix = options?.suffix ?? 'away';
  const includeSuffix = options?.includeSuffix !== false;

  let value: string;
  if (meters < 1000) {
    value = `${Math.round(meters)}m`;
  } else {
    value = `${(meters / 1000).toFixed(1)}km`;
  }

  return includeSuffix && suffix ? `${value} ${suffix}` : value;
}

/** Distance label for outside-zone messaging, e.g. "142m away — outside 100m zone". */
export function formatOutsideZoneDistance(
  distanceM: number | null | undefined,
  radiusM: number | null | undefined,
): string | null {
  const dist = formatDistanceMeters(distanceM, { suffix: 'away', includeSuffix: true });
  if (!dist) return null;
  if (radiusM != null && Number.isFinite(radiusM)) {
    return `${dist} — outside ${Math.round(radiusM)}m zone`;
  }
  return dist;
}
