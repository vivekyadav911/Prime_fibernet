import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import type MapView from 'react-native-maps';
import { Circle, Marker, type Region } from 'react-native-maps';

import { FreeMapView } from '@/components/map';
import { adminColors } from '@/theme/admin';
import { coordinatesEqual } from '@/utils/coordinates';

import { DEFAULT_MAP_DELTA, type GeofenceLocationPickerProps } from './types';

function regionFromCenter(
  center: GeofenceLocationPickerProps['center'],
  delta = DEFAULT_MAP_DELTA,
): Region {
  return {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

export function GeofenceLocationPicker({
  center,
  radius,
  onCenterChange,
  mapHeight = 240,
}: GeofenceLocationPickerProps) {
  const mapRef = useRef<MapView>(null);
  const initialRegion = useRef(regionFromCenter(center)).current;
  const lastAnimatedCenter = useRef(center);

  useEffect(() => {
    if (coordinatesEqual(lastAnimatedCenter.current, center)) return;
    lastAnimatedCenter.current = center;
    mapRef.current?.animateToRegion(regionFromCenter(center), 350);
  }, [center]);

  return (
    <FreeMapView
      ref={mapRef}
      style={[styles.map, { height: mapHeight }]}
      initialRegion={initialRegion}
      onPress={(event) => onCenterChange(event.nativeEvent.coordinate)}
    >
      <Marker
        coordinate={center}
        draggable
        onDragEnd={(event) => onCenterChange(event.nativeEvent.coordinate)}
      />
      <Circle
        center={center}
        radius={radius}
        strokeColor={adminColors.primary}
        fillColor="rgba(91,79,207,0.2)"
      />
    </FreeMapView>
  );
}

const styles = StyleSheet.create({
  map: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});
