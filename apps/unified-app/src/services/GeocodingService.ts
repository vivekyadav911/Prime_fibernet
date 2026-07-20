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
const USER_AGENT = 'PrimeFibernet/1.0 (officer-location; contact=support@primefibernet.local)';

function buildAddressQuery(parts: { address?: string; city?: string; state?: string }): string {
  return [parts.address, parts.city, parts.state].filter(Boolean).join(', ').trim();
}

/** Broaden street queries Nominatim often misses (house no. + colony). */
function broadenAddressQuery(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const variants = [trimmed];
  // Drop leading plot/house token: "G-198, shyam park, ghaziabad" → "shyam park, ghaziabad"
  const withoutPlot = trimmed.replace(/^[^,]+,\s*/i, '').trim();
  if (withoutPlot && withoutPlot.toLowerCase() !== trimmed.toLowerCase()) {
    variants.push(withoutPlot);
  }
  if (!/india/i.test(trimmed)) {
    variants.push(`${trimmed}, India`);
    if (withoutPlot) variants.push(`${withoutPlot}, India`);
  }
  return [...new Set(variants)];
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

async function geocodeWithExpo(query: string): Promise<GeocodeResult[]> {
  try {
    const Location = await import('expo-location');
    const results = await Location.geocodeAsync(query);
    return results
      .filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude))
      .map((r) => ({
        latitude: r.latitude,
        longitude: r.longitude,
        formattedAddress: query,
      }));
  } catch {
    return [];
  }
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

async function reverseGeocodeWithExpo(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult | null> {
  try {
    const Location = await import('expo-location');
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    const top = results[0];
    if (!top) return null;
    const formattedAddress = [top.name, top.street, top.city, top.region, top.postalCode, top.country]
      .filter(Boolean)
      .join(', ');
    return {
      formattedAddress: formattedAddress || undefined,
      address: top.street ?? top.name ?? undefined,
      city: top.city ?? undefined,
      state: top.region ?? undefined,
    };
  } catch {
    return null;
  }
}

/** Geocode an address using Nominatim, then device geocoder as fallback. */
export async function geocodeAddress(parts: {
  address?: string;
  city?: string;
  state?: string;
}): Promise<GeocodeResult> {
  const query = buildAddressQuery(parts);
  if (!query) {
    throw new Error('Enter an address before searching on the map.');
  }

  for (const variant of broadenAddressQuery(query)) {
    const nominatim = await geocodeWithNominatim(variant, 3);
    if (nominatim.length) return nominatim[0]!;
  }

  for (const variant of broadenAddressQuery(query)) {
    const expo = await geocodeWithExpo(variant);
    if (expo.length) return expo[0]!;
  }

  throw new Error(
    'Address not found. Try area + city (e.g. “Shyam Park, Ghaziabad, UP”) or enter coordinates.',
  );
}

/** Return multiple address suggestions for map search (OpenStreetMap Nominatim). */
export async function searchAddressSuggestions(
  query: string,
  limit = 5,
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  for (const variant of broadenAddressQuery(trimmed)) {
    const nominatim = await geocodeWithNominatim(variant, limit);
    if (nominatim.length) return nominatim;
  }
  return geocodeWithExpo(trimmed);
}

/** Reverse geocode coordinates using Nominatim, then device geocoder as fallback. */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult> {
  try {
    return await reverseGeocodeWithNominatim(latitude, longitude);
  } catch {
    const expo = await reverseGeocodeWithExpo(latitude, longitude);
    if (expo) return expo;
    throw new Error('Could not resolve address for this location.');
  }
}
