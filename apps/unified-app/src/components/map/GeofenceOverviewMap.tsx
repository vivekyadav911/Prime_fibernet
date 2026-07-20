import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { LeafletMapView, type LeafletCircle } from '@/components/map/LeafletMapView';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import type { Geofence } from '@/types/attendance';

type Props = {
  geofences: Geofence[];
  selectedId?: string | null;
  style?: StyleProp<ViewStyle>;
  /** Web split layout only — ignored on native. */
  fill?: boolean;
};

/** Native overview map — all configured zones (active + inactive), Leaflet WebView. */
export function GeofenceOverviewMap({ geofences, selectedId, style }: Props) {
  const circles: LeafletCircle[] = geofences
    .filter((g) => g.geometry.shape === 'circle')
    .map((g) => {
      const geometry = g.geometry as Extract<Geofence['geometry'], { shape: 'circle' }>;
      const isSelected = g.id === selectedId;
      return {
        id: g.id,
        latitude: geometry.center.latitude,
        longitude: geometry.center.longitude,
        radius: geometry.radius,
        color: isSelected ? adminColors.primary : colors.textSecondary,
        fillColor: g.isActive ? adminColors.primary : colors.textSecondary,
        fillOpacity: g.isActive ? 0.18 : 0.1,
        weight: isSelected ? 3 : 2,
      };
    });

  const selected = circles.find((c) => c.id === selectedId);

  return (
    <LeafletMapView
      style={[styles.map, style]}
      circles={circles}
      center={selected ? { latitude: selected.latitude, longitude: selected.longitude } : null}
      zoom={selected ? 14 : undefined}
      fitToContent
    />
  );
}

const styles = StyleSheet.create({
  map: { height: 220 },
});
