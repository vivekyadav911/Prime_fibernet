const cache = new Map<string, string>();

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

/** Reverse geocode via OpenStreetMap Nominatim (no API key). */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = cacheKey(lat, lng);
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'PrimeFibernet/1.0' },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { display_name?: string };
    const address = json.display_name ?? null;
    if (address) cache.set(key, address);
    return address;
  } catch {
    return null;
  }
}

export function clearReverseGeocodeCache(): void {
  cache.clear();
}
