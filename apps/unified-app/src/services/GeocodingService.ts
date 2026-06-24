export type GeocodeResult = {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  address?: string;
  city?: string;
  state?: string;
};

export type ReverseGeocodeResult = {
  formattedAddress?: string;
  address?: string;
  city?: string;
  state?: string;
};

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'PrimeFibernet/1.0 (geofence-admin)';

function buildAddressQuery(parts: { address?: string; city?: string; state?: string }): string {
  return [parts.address, parts.city, parts.state].filter(Boolean).join(', ').trim();
}

async function geocodeWithNominatim(query: string, limit = 1): Promise<GeocodeResult[]> {
  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Address lookup failed. Please try again.');
  }

  const data = (await response.json()) as Array<{
    lat?: string;
    lon?: string;
    display_name?: string;
    address?: {
      road?: string;
      city?: string;
      town?: string;
      village?: string;
      state?: string;
    };
  }>;

  if (!data.length) {
    return [];
  }

  return data.reduce<GeocodeResult[]>((acc, top) => {
    const latitude = top.lat != null ? Number(top.lat) : NaN;
    const longitude = top.lon != null ? Number(top.lon) : NaN;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return acc;

    const addr = top.address;
    acc.push({
      latitude,
      longitude,
      formattedAddress: top.display_name,
      address: addr?.road,
      city: addr?.city ?? addr?.town ?? addr?.village,
      state: addr?.state,
    });
    return acc;
  }, []);
}

async function reverseGeocodeWithNominatim(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult> {
  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Could not resolve address for this location.');
  }

  const data = (await response.json()) as {
    display_name?: string;
    address?: {
      road?: string;
      city?: string;
      town?: string;
      village?: string;
      state?: string;
    };
  };

  const addr = data.address;
  return {
    formattedAddress: data.display_name,
    address: addr?.road,
    city: addr?.city ?? addr?.town ?? addr?.village,
    state: addr?.state,
  };
}

/** Geocode an address using free OpenStreetMap Nominatim (no API key). */
export async function geocodeAddress(parts: {
  address?: string;
  city?: string;
  state?: string;
}): Promise<GeocodeResult> {
  const query = buildAddressQuery(parts);
  if (!query) {
    throw new Error('Enter an address before searching on the map.');
  }

  const results = await geocodeWithNominatim(query, 1);
  if (!results.length) {
    throw new Error('Address not found. Try a more specific address or set coordinates manually.');
  }
  return results[0]!;
}

/** Return multiple address suggestions for map search (OpenStreetMap Nominatim). */
export async function searchAddressSuggestions(
  query: string,
  limit = 5,
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  return geocodeWithNominatim(trimmed, limit);
}

/** Reverse geocode coordinates using free OpenStreetMap Nominatim (no API key). */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult> {
  return reverseGeocodeWithNominatim(latitude, longitude);
}
