import { Platform } from 'react-native';

import type { MapStyle } from '@/types/map';

/** Free tile layers — no API keys, no billing. */
export type OsmTileLayer = {
  urlTemplate: string;
  maxZoom: number;
  attribution: string;
};

export const OSM_TILE_LAYERS: Record<'standard' | 'terrain' | 'satellite', OsmTileLayer> = {
  standard: {
    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  },
  terrain: {
    urlTemplate: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    maxZoom: 17,
    attribution: '© OpenTopoMap © OpenStreetMap',
  },
  satellite: {
    // Esri World Imagery — free to use with attribution (no API key)
    urlTemplate:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: '© Esri',
  },
};

/** iOS uses Apple Maps (free). Android uses OSM/Esri tiles above. */
export const USE_OSM_TILES = Platform.OS === 'android';

export function resolveNativeMapType(mapStyle: MapStyle): 'standard' | 'satellite' | 'hybrid' {
  if (mapStyle === 'satellite') return 'satellite';
  return 'standard';
}

export function resolveOsmTileLayer(mapStyle: MapStyle): OsmTileLayer {
  if (mapStyle === 'terrain') return OSM_TILE_LAYERS.terrain;
  if (mapStyle === 'satellite') return OSM_TILE_LAYERS.satellite;
  return OSM_TILE_LAYERS.standard;
}
