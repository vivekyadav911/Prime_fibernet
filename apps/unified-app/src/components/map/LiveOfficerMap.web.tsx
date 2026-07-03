import '@/shims/leaflet.css';

import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Circle, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

import { getOfficerColor, getOfficerInitials } from '@/constants/mapTheme';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { Geofence, OfficerLiveLocation } from '@/types/attendance';
import { formatSyncLabel } from '@/utils/dateUtils';

const DEFAULT_CENTER = { latitude: 28.6139, longitude: 77.209 };
const DEFAULT_ZOOM = 11;
const MAP_HEIGHT = 228;

/** Leaflet fitBounds padding — keeps markers/geofences out from under fixed overlays. */
const FIT_BOUNDS_PADDING: L.PointExpression = [58, 72];

type ChipTone = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

const CHIP_TONES: Record<ChipTone, { bg: string; text: string; border: string }> = {
  success: { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
  warning: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  error: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
  info: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  neutral: { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' },
  primary: { bg: adminColors.primaryTint, text: adminColors.primary, border: '#C9C2F0' },
};

function MapChip({ label, tone }: { label: string; tone: ChipTone }) {
  const palette = CHIP_TONES[tone];
  return (
    <View style={[styles.chip, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.chipText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

type Props = {
  locations: OfficerLiveLocation[];
  geofences?: Geofence[];
  siteLabel?: string;
  lastSync?: string;
  inGeofenceCount?: number;
  geofenceActive?: boolean;
};

function officerMarkerIcon(location: OfficerLiveLocation, colorIndex: number): L.DivIcon {
  const color =
    location.attendanceStatus === 'checked_out'
      ? colors.textSecondary
      : getOfficerColor(location.officerName, colorIndex);
  const initials = getOfficerInitials(location.officerName);
  const isLive = location.attendanceStatus === 'checked_in';

  return L.divIcon({
    className: 'live-officer-map-marker',
    html: `
      <div style="
        position: relative;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${
          isLive
            ? `<div style="
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid ${color};
          opacity: 0.35;
        "></div>`
            : ''
        }
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid #fff;
          color: #fff;
          font-weight: 700;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        ">${initials}</div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function FitMapBounds({ locations, geofences }: { locations: OfficerLiveLocation[]; geofences: Geofence[] }) {
  const map = useMap();

  useEffect(() => {
    const circleCenters: [number, number][] = [];
    for (const g of geofences) {
      if (g.geometry.shape === 'circle') {
        circleCenters.push([g.geometry.center.latitude, g.geometry.center.longitude]);
      }
    }

    const points: [number, number][] = [
      ...locations.map((loc) => [loc.coordinates.latitude, loc.coordinates.longitude] as [number, number]),
      ...circleCenters,
    ];

    if (points.length === 0) {
      map.setView([DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude], DEFAULT_ZOOM);
      return;
    }

    if (points.length === 1) {
      const point = points[0]!;
      map.setView(point, 13);
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: FIT_BOUNDS_PADDING, maxZoom: 14 });
  }, [geofences, locations, map]);

  return null;
}

export function LiveOfficerMap({
  locations,
  geofences = [],
  siteLabel = 'Monitoring all zones',
  lastSync,
  inGeofenceCount = 0,
  geofenceActive = false,
}: Props) {
  const activeGeofences = useMemo(
    () => geofences.filter((g) => g.isActive && g.geometry.shape === 'circle'),
    [geofences],
  );

  const initialCenter = locations[0]?.coordinates ?? DEFAULT_CENTER;
  const sync = formatSyncLabel(lastSync);

  return (
    <View style={styles.wrap}>
      <MapContainer
        center={[initialCenter.latitude, initialCenter.longitude]}
        zoom={DEFAULT_ZOOM}
        style={styles.map}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitMapBounds locations={locations} geofences={activeGeofences} />
        {activeGeofences.map((geofence) => {
          if (geofence.geometry.shape !== 'circle') return null;
          return (
            <Circle
              key={geofence.id}
              center={[geofence.geometry.center.latitude, geofence.geometry.center.longitude]}
              radius={geofence.geometry.radius}
              pathOptions={{
                color: adminColors.primary,
                fillColor: adminColors.primary,
                fillOpacity: 0.12,
              }}
            />
          );
        })}
        {locations.map((location, index) => (
          <Marker
            key={location.officerId}
            position={[location.coordinates.latitude, location.coordinates.longitude]}
            icon={officerMarkerIcon(location, index)}
          />
        ))}
      </MapContainer>

      <View style={styles.mapOverlayTop} pointerEvents="none">
        <MapChip
          label={geofenceActive ? 'Geofence active' : 'Geofence inactive'}
          tone={geofenceActive ? 'success' : 'neutral'}
        />
        {inGeofenceCount > 0 ? (
          <MapChip label={`${inGeofenceCount} in zone`} tone="info" />
        ) : null}
      </View>

      <View style={styles.mapOverlayBottom} pointerEvents="none">
        <Text style={styles.mapSiteLabel} numberOfLines={1}>
          {siteLabel}
        </Text>
        <Text style={[styles.mapSyncLabel, sync.isStale && styles.mapSyncStale]}>
          {sync.label}
          {sync.isStale ? ' · Data may be stale' : ''}
        </Text>
      </View>

      {locations.length === 0 ? (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <Text style={styles.emptyTitle}>No live locations</Text>
          <Text style={styles.emptyBody}>
            Officer GPS pins appear here when the mobile app reports location.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: MAP_HEIGHT,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    backgroundColor: adminColors.cardBg,
  },
  map: {
    height: '100%',
    width: '100%',
  },
  mapOverlayTop: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  mapOverlayBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderDefault,
    gap: 2,
  },
  mapSiteLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  mapSyncLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  mapSyncStale: {
    color: adminColors.badgePending,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  emptyBody: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
