import { StyleSheet } from 'react-native';

import { LeafletMapView } from '@/components/map/LeafletMapView';
import { adminColors } from '@/theme/admin';

import { DEFAULT_MAP_DELTA, type GeofenceLocationPickerProps } from './types';

/** Native geofence picker — Leaflet WebView (tap or drag pin to move center). */
export function GeofenceLocationPicker({
  center,
  radius,
  onCenterChange,
  mapHeight = 240,
}: GeofenceLocationPickerProps) {
  const zoom = Math.round(Math.log2(360 / DEFAULT_MAP_DELTA) - 1);

  return (
    <LeafletMapView
      style={[styles.map, { height: mapHeight }]}
      center={center}
      zoom={zoom}
      pins={[
        {
          id: 'center',
          latitude: center.latitude,
          longitude: center.longitude,
          kind: 'dot',
          color: adminColors.primary,
          draggable: true,
        },
      ]}
      circles={[
        {
          id: 'radius',
          latitude: center.latitude,
          longitude: center.longitude,
          radius,
          color: adminColors.primary,
          fillOpacity: 0.2,
        },
      ]}
      onMapPress={onCenterChange}
      onPinDragEnd={onCenterChange}
    />
  );
}

const styles = StyleSheet.create({
  map: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});
