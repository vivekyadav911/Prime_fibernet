import '@/shims/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

import { adminColors } from '@/theme/admin';
import { coordinatesEqual } from '@/utils/coordinates';

import { DEFAULT_MAP_DELTA, type GeofenceLocationPickerProps } from './types';

// Leaflet default marker assets break under Metro bundler without explicit URLs.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapInteraction({
  center,
  onCenterChange,
}: {
  center: GeofenceLocationPickerProps['center'];
  onCenterChange: GeofenceLocationPickerProps['onCenterChange'];
}) {
  const map = useMap();
  const lastCenter = useRef(center);

  useMapEvents({
    click(event) {
      onCenterChange({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });

  useEffect(() => {
    if (coordinatesEqual(lastCenter.current, center)) return;
    lastCenter.current = center;
    map.setView([center.latitude, center.longitude], map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

export function GeofenceLocationPicker({
  center,
  radius,
  onCenterChange,
  mapHeight = 240,
}: GeofenceLocationPickerProps) {
  const zoom = Math.round(Math.log2(360 / DEFAULT_MAP_DELTA) - 1);

  return (
    <View style={[styles.wrap, { height: mapHeight }]}>
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={zoom}
        style={styles.map}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapInteraction center={center} onCenterChange={onCenterChange} />
        <Marker
          position={[center.latitude, center.longitude]}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const target = event.target as L.Marker;
              const latLng = target.getLatLng();
              onCenterChange({ latitude: latLng.lat, longitude: latLng.lng });
            },
          }}
        />
        <Circle
          center={[center.latitude, center.longitude]}
          radius={radius}
          pathOptions={{
            color: adminColors.primary,
            fillColor: adminColors.primary,
            fillOpacity: 0.2,
          }}
        />
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    height: '100%',
    width: '100%',
  },
});
