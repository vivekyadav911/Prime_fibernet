import Constants from 'expo-constants';

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

function getGoogleMapsApiKey(): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  const key = extra?.googleMapsApiKey ?? process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  return key?.trim() || undefined;
}

function buildAddressQuery(parts: { address?: string; city?: string; state?: string }): string {
  return [parts.address, parts.city, parts.state].filter(Boolean).join(', ').trim();
}

async function geocodeWithGoogle(query: string): Promise<GeocodeResult> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    throw new Error('Google Maps API key is not configured');
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', query);
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Address lookup failed. Please try again.');
  }

  const data = (await response.json()) as {
    status: string;
    results?: Array<{
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
      address_components?: Array<{ long_name: string; types: string[] }>;
    }>;
  };

  if (data.status !== 'OK' || !data.results?.length) {
    throw new Error('Address not found. Try a more specific address or set coordinates manually.');
  }

  const top = data.results[0];
  if (!top) {
    throw new Error('Address not found. Try a more specific address or set coordinates manually.');
  }
  const location = top.geometry?.location;
  if (location?.lat == null || location?.lng == null) {
    throw new Error('Address not found. Try a more specific address or set coordinates manually.');
  }

  let city: string | undefined;
  let state: string | undefined;
  for (const component of top.address_components ?? []) {
    if (component.types.includes('locality')) city = component.long_name;
    if (component.types.includes('administrative_area_level_1')) state = component.long_name;
  }

  return {
    latitude: location.lat,
    longitude: location.lng,
    formattedAddress: top.formatted_address,
    city,
    state,
  };
}

async function geocodeWithNominatim(query: string): Promise<GeocodeResult> {
  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
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
    throw new Error('Address not found. Try a more specific address or set coordinates manually.');
  }

  const top = data[0];
  if (!top) {
    throw new Error('Address not found. Try a more specific address or set coordinates manually.');
  }
  const latitude = top.lat != null ? Number(top.lat) : NaN;
  const longitude = top.lon != null ? Number(top.lon) : NaN;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Address not found. Try a more specific address or set coordinates manually.');
  }

  const addr = top.address;
  const city = addr?.city ?? addr?.town ?? addr?.village;
  const state = addr?.state;
  const street = addr?.road;

  return {
    latitude,
    longitude,
    formattedAddress: top.display_name,
    address: street,
    city,
    state,
  };
}

async function reverseGeocodeWithGoogle(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    throw new Error('Google Maps API key is not configured');
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('latlng', `${latitude},${longitude}`);
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Could not resolve address for this location.');
  }

  const data = (await response.json()) as {
    status: string;
    results?: Array<{
      formatted_address?: string;
      address_components?: Array<{ long_name: string; types: string[] }>;
    }>;
  };

  if (data.status !== 'OK' || !data.results?.length) {
    throw new Error('Could not resolve address for this location.');
  }

  const top = data.results[0];
  if (!top) {
    throw new Error('Could not resolve address for this location.');
  }
  let address: string | undefined;
  let city: string | undefined;
  let state: string | undefined;

  for (const component of top.address_components ?? []) {
    if (component.types.includes('route') || component.types.includes('street_address')) {
      address = component.long_name;
    }
    if (component.types.includes('locality')) city = component.long_name;
    if (component.types.includes('administrative_area_level_1')) state = component.long_name;
  }

  return {
    formattedAddress: top.formatted_address,
    address,
    city,
    state,
  };
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

export async function geocodeAddress(parts: {
  address?: string;
  city?: string;
  state?: string;
}): Promise<GeocodeResult> {
  const query = buildAddressQuery(parts);
  if (!query) {
    throw new Error('Enter an address before searching on the map.');
  }

  if (getGoogleMapsApiKey()) {
    return geocodeWithGoogle(query);
  }
  return geocodeWithNominatim(query);
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult> {
  if (getGoogleMapsApiKey()) {
    return reverseGeocodeWithGoogle(latitude, longitude);
  }
  return reverseGeocodeWithNominatim(latitude, longitude);
}

export function hasGoogleMapsApiKey(): boolean {
  return Boolean(getGoogleMapsApiKey());
}
