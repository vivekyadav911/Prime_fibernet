import { forwardRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { UrlTile, type MapViewProps } from 'react-native-maps';

import {
  USE_OSM_TILES,
  resolveNativeMapType,
  resolveOsmTileLayer,
} from '@/constants/mapConfig';
import { colors } from '@/theme/colors';
import type { MapStyle } from '@/types/map';

export type FreeMapViewProps = MapViewProps & {
  /** Map appearance — always uses free providers (Apple Maps / OSM / OpenTopoMap / Esri imagery). */
  mapStyle?: MapStyle;
  showAttribution?: boolean;
};

/**
 * MapView wrapper that never requires Google Maps billing.
 * - iOS: Apple Maps (MapKit)
 * - Android: OpenStreetMap / OpenTopoMap / Esri imagery via UrlTile
 */
export const FreeMapView = forwardRef<MapView, FreeMapViewProps>(function FreeMapView(
  { mapStyle = 'standard', showAttribution = Platform.OS === 'android', style, children, mapType, ...props },
  ref,
) {
  if (USE_OSM_TILES) {
    const tile = resolveOsmTileLayer(mapStyle);
    return (
      <View style={[styles.wrap, style]}>
        <MapView ref={ref} {...props} style={StyleSheet.absoluteFill} mapType="none">
          <UrlTile
            urlTemplate={tile.urlTemplate}
            maximumZ={tile.maxZoom}
            flipY={false}
            tileSize={256}
          />
          {children}
        </MapView>
        {showAttribution ? (
          <Text style={styles.attribution} pointerEvents="none">
            {tile.attribution}
          </Text>
        ) : null}
      </View>
    );
  }

  const appleMapType = mapType ?? resolveNativeMapType(mapStyle);
  return (
    <MapView ref={ref} {...props} style={style} mapType={appleMapType}>
      {children}
    </MapView>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    overflow: 'hidden',
  },
  attribution: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    fontSize: 9,
    color: colors.textSecondary,
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
