import '@/shims/leaflet.css';

import L from 'leaflet';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Circle, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/spacing';
import type { Geofence } from '@/types/attendance';

const DEFAULT_CENTER = { latitude: 28.6139, longitude: 77.209 };
const DEFAULT_ZOOM = 12;
const FIT_BOUNDS_PADDING: L.PointExpression = [48, 48];
/** If zones span more than this many degrees, focus selected/first instead of world view. */
const MAX_FIT_SPAN_DEG = 25;

const pinIcon = L.divIcon({
  className: 'geofence-overview-pin',
  html: `<div style="
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${adminColors.primary};
    border: 2px solid #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.35);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

type Props = {
  geofences: Geofence[];
  selectedId?: string | null;
  style?: StyleProp<ViewStyle>;
  /** Fill parent height (split layout) instead of fixed strip. */
  fill?: boolean;
};

function FitGeofenceBounds({
  geofences,
  selectedId,
  layoutKey,
}: {
  geofences: Geofence[];
  selectedId?: string | null;
  layoutKey: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize({ animate: false });

    const circles = geofences.filter(
      (g): g is Geofence & { geometry: Extract<Geofence['geometry'], { shape: 'circle' }> } =>
        g.geometry.shape === 'circle',
    );
    const points: [number, number][] = circles.map((g) => [
      g.geometry.center.latitude,
      g.geometry.center.longitude,
    ]);

    if (points.length === 0) {
      map.setView([DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude], DEFAULT_ZOOM);
      return;
    }

    const selected = circles.find((g) => g.id === selectedId);
    if (selected) {
      map.setView(
        [selected.geometry.center.latitude, selected.geometry.center.longitude],
        14,
      );
      return;
    }

    if (points.length === 1) {
      map.setView(points[0]!, 14);
      return;
    }

    const bounds = L.latLngBounds(points);
    const latSpan = bounds.getNorth() - bounds.getSouth();
    const lngSpan = Math.abs(bounds.getEast() - bounds.getWest());

    // Distant zones (e.g. AU + IN) would zoom to a world mosaic in a wide strip.
    if (latSpan > MAX_FIT_SPAN_DEG || lngSpan > MAX_FIT_SPAN_DEG) {
      map.setView(points[0]!, 13);
      return;
    }

    map.fitBounds(bounds, { padding: FIT_BOUNDS_PADDING, maxZoom: 14 });
  }, [geofences, layoutKey, map, selectedId]);

  return null;
}

/** Web overview map (Leaflet) — all configured zones from the same list data. */
export function GeofenceOverviewMap({ geofences, selectedId, style, fill = false }: Props) {
  const [layoutKey, setLayoutKey] = useState(0);
  const first = geofences.find((g) => g.geometry.shape === 'circle');
  const initialCenter =
    first?.geometry.shape === 'circle' ? first.geometry.center : DEFAULT_CENTER;

  return (
    <View
      style={[styles.wrap, fill ? styles.wrapFill : null, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0) setLayoutKey((k) => k + 1);
      }}
    >
      <MapContainer
        center={[initialCenter.latitude, initialCenter.longitude]}
        zoom={DEFAULT_ZOOM}
        style={styles.map}
        scrollWheelZoom
        worldCopyJump={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap
        />
        <FitGeofenceBounds
          geofences={geofences}
          selectedId={selectedId}
          layoutKey={layoutKey}
        />
        {geofences.map((g) => {
          if (g.geometry.shape !== 'circle') return null;
          const isSelected = g.id === selectedId;
          return (
            <Circle
              key={g.id}
              center={[g.geometry.center.latitude, g.geometry.center.longitude]}
              radius={g.geometry.radius}
              pathOptions={{
                color: isSelected ? adminColors.primary : colors.textSecondary,
                fillColor: g.isActive ? adminColors.primary : colors.textSecondary,
                fillOpacity: g.isActive ? 0.18 : 0.1,
                weight: isSelected ? 3 : 2,
              }}
            />
          );
        })}
        {geofences.map((g) => {
          if (g.geometry.shape !== 'circle') return null;
          return (
            <Marker
              key={`pin-${g.id}`}
              position={[g.geometry.center.latitude, g.geometry.center.longitude]}
              icon={pinIcon}
            />
          );
        })}
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    backgroundColor: adminColors.cardBg,
  },
  wrapFill: {
    flex: 1,
    height: undefined,
    minHeight: 0,
    alignSelf: 'stretch',
  },
  map: {
    height: '100%',
    width: '100%',
  },
});
