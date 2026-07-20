import '@/shims/leaflet.css';

import { Ionicons } from '@expo/vector-icons';
import L from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

import { getOfficerColor, getOfficerInitials } from '@/constants/mapTheme';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { Geofence, OfficerLiveLocation } from '@/types/attendance';
import { formatSyncLabel } from '@/utils/dateUtils';
import { formatGeofenceAddress } from '@/utils/geofenceDisplay';
import { resolveOfficerPhotoUrl } from '@/utils/resolveOfficerPhotoUrl';

const DEFAULT_CENTER = { latitude: 28.6139, longitude: 77.209 };
const DEFAULT_ZOOM = 11;
const OFFICER_FOCUS_ZOOM = 16;
const MAP_HEIGHT_COLLAPSED = 228;
/** If pins span more than this, prefer live officers (or first pin) over a world mosaic. */
const MAX_FIT_SPAN_DEG = 25;

/** Leaflet fitBounds padding — keeps markers/geofences out from under fixed overlays. */
const FIT_BOUNDS_PADDING: L.PointExpression = [58, 72];

/** Above Leaflet panes/controls (controls use z-index 1000). */
const OVERLAY_Z = 1200;

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

function attendanceStatusLabel(status: OfficerLiveLocation['attendanceStatus']): string {
  switch (status) {
    case 'checked_in':
      return 'Active';
    case 'checked_out':
      return 'Inactive';
    default:
      return 'Not started';
  }
}

function resolveOfficerPlace(location: OfficerLiveLocation, geofences: Geofence[]): string {
  if (location.geofenceId) {
    const match = geofences.find((g) => g.id === location.geofenceId);
    if (match) {
      const address = formatGeofenceAddress(match);
      return match.name ? `${match.name} · ${address}` : address;
    }
  }
  if (location.isInsideGeofence) return 'Inside active zone';
  return `${location.coordinates.latitude.toFixed(5)}, ${location.coordinates.longitude.toFixed(5)}`;
}

type Props = {
  locations: OfficerLiveLocation[];
  geofences?: Geofence[];
  siteLabel?: string;
  lastSync?: string;
  inGeofenceCount?: number;
  geofenceActive?: boolean;
  /** When set, map flies to this officer's live pin. */
  focusOfficerId?: string | null;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  onOfficerFocus?: (officerId: string) => void;
};

function officerMarkerIcon(
  location: OfficerLiveLocation,
  colorIndex: number,
  focused: boolean,
): L.DivIcon {
  const color =
    location.attendanceStatus === 'checked_out'
      ? colors.textSecondary
      : getOfficerColor(location.officerName, colorIndex);
  const initials = getOfficerInitials(location.officerName);
  const photoUrl = resolveOfficerPhotoUrl(location.officerAvatar) ?? '';
  const isLive = location.attendanceStatus === 'checked_in';
  const size = focused ? 52 : 44;
  const inner = focused ? 42 : 36;
  const escapedPhoto = photoUrl
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');

  const face =
    escapedPhoto.length > 0
      ? `<img src="${escapedPhoto}" alt="" style="
          width: ${inner}px;
          height: ${inner}px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          display: block;
          background: ${color};
        " onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><div style="
          display: none;
          width: ${inner}px;
          height: ${inner}px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid #fff;
          color: #fff;
          font-weight: 700;
          font-size: ${focused ? 14 : 12}px;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        ">${initials}</div>`
      : `<div style="
          width: ${inner}px;
          height: ${inner}px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid #fff;
          color: #fff;
          font-weight: 700;
          font-size: ${focused ? 14 : 12}px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        ">${initials}</div>`;

  return L.divIcon({
    className: 'live-officer-map-marker',
    html: `
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${
          isLive || focused
            ? `<div style="
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid ${focused ? adminColors.primary : color};
          opacity: ${focused ? 0.55 : 0.35};
        "></div>`
            : ''
        }
        ${face}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FitMapBounds({
  locations,
  geofences,
  enabled,
}: {
  locations: OfficerLiveLocation[];
  geofences: Geofence[];
  enabled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;

    const officerPoints: [number, number][] = locations.map(
      (loc) => [loc.coordinates.latitude, loc.coordinates.longitude],
    );
    const circleCenters: [number, number][] = [];
    for (const g of geofences) {
      if (g.geometry.shape === 'circle') {
        circleCenters.push([g.geometry.center.latitude, g.geometry.center.longitude]);
      }
    }

    // Prefer live pins when present — mixing remote geofences zooms to a world mosaic.
    const points = officerPoints.length > 0 ? officerPoints : circleCenters;

    if (points.length === 0) {
      map.setView([DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude], DEFAULT_ZOOM);
      return;
    }

    if (points.length === 1) {
      map.setView(points[0]!, 13);
      return;
    }

    const bounds = L.latLngBounds(points);
    const latSpan = bounds.getNorth() - bounds.getSouth();
    const lngSpan = Math.abs(bounds.getEast() - bounds.getWest());
    if (latSpan > MAX_FIT_SPAN_DEG || lngSpan > MAX_FIT_SPAN_DEG) {
      map.setView(points[0]!, 13);
      return;
    }

    map.fitBounds(bounds, { padding: FIT_BOUNDS_PADDING, maxZoom: 14 });
  }, [enabled, geofences, locations, map]);

  return null;
}

function FlyToOfficer({
  officerId,
  locations,
}: {
  officerId: string | null | undefined;
  locations: OfficerLiveLocation[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!officerId) return;
    const loc = locations.find((l) => l.officerId === officerId);
    if (!loc) return;
    map.flyTo(
      [loc.coordinates.latitude, loc.coordinates.longitude],
      OFFICER_FOCUS_ZOOM,
      { duration: 0.55 },
    );
  }, [locations, map, officerId]);

  return null;
}

/** Leaflet must remeasure after expand/collapse or tiles stay blank. */
function InvalidateOnResize({ layoutKey }: { layoutKey: number }) {
  const map = useMap();

  useEffect(() => {
    // Double rAF: wait for flex layout after expand before measuring.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        map.invalidateSize({ animate: false });
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [layoutKey, map]);

  return null;
}

function OfficerMarker({
  location,
  index,
  focused,
  placeLabel,
  onOfficerFocus,
}: {
  location: OfficerLiveLocation;
  index: number;
  focused: boolean;
  placeLabel: string;
  onOfficerFocus?: (officerId: string) => void;
}) {
  const markerRef = useRef<L.Marker | null>(null);
  const status = attendanceStatusLabel(location.attendanceStatus);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    if (focused) marker.openPopup();
  }, [focused]);

  return (
    <Marker
      ref={markerRef}
      position={[location.coordinates.latitude, location.coordinates.longitude]}
      icon={officerMarkerIcon(location, index, focused)}
      eventHandlers={{
        click: () => onOfficerFocus?.(location.officerId),
      }}
    >
      <Popup>
        <div style={{ minWidth: 160, fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: '#111827' }}>
            {location.officerName || 'Officer'}
          </div>
          <div style={{ fontSize: 12, marginBottom: 2, color: '#374151' }}>
            Status: <strong>{status}</strong>
          </div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>{placeLabel}</div>
        </div>
      </Popup>
    </Marker>
  );
}

export function LiveOfficerMap({
  locations,
  geofences = [],
  siteLabel = 'Monitoring all zones',
  lastSync,
  inGeofenceCount = 0,
  geofenceActive = false,
  focusOfficerId = null,
  expanded = false,
  onToggleExpanded,
  onOfficerFocus,
}: Props) {
  const activeGeofences = useMemo(
    () => geofences.filter((g) => g.isActive && g.geometry.shape === 'circle'),
    [geofences],
  );

  const initialCenter = locations[0]?.coordinates ?? DEFAULT_CENTER;
  const sync = formatSyncLabel(lastSync);
  const layoutKey = expanded ? 1 : 0;

  return (
    <View style={[styles.wrap, expanded ? styles.wrapExpanded : null]}>
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
        <InvalidateOnResize layoutKey={layoutKey} />
        <FitMapBounds
          locations={locations}
          geofences={activeGeofences}
          enabled={!focusOfficerId}
        />
        <FlyToOfficer officerId={focusOfficerId} locations={locations} />
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
          <OfficerMarker
            key={location.officerId}
            location={location}
            index={index}
            focused={location.officerId === focusOfficerId}
            placeLabel={resolveOfficerPlace(location, geofences)}
            onOfficerFocus={onOfficerFocus}
          />
        ))}
      </MapContainer>

      <View style={styles.mapOverlayTop} pointerEvents="box-none">
        <View style={styles.chipRow} pointerEvents="none">
          <MapChip
            label={geofenceActive ? 'Geofence active' : 'Geofence inactive'}
            tone={geofenceActive ? 'success' : 'neutral'}
          />
          {inGeofenceCount > 0 ? (
            <MapChip label={`${inGeofenceCount} in zone`} tone="info" />
          ) : null}
        </View>
        {onToggleExpanded ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Minimize map' : 'Expand map to full view'}
            hitSlop={8}
            style={({ pressed }) => [styles.expandBtn, pressed && styles.expandBtnPressed]}
            onPress={onToggleExpanded}
          >
            <Ionicons
              name={expanded ? 'contract-outline' : 'expand-outline'}
              size={18}
              color={adminColors.primary}
            />
            <Text style={styles.expandBtnText}>{expanded ? 'Minimize' : 'Full map'}</Text>
          </Pressable>
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
    height: MAP_HEIGHT_COLLAPSED,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    backgroundColor: adminColors.cardBg,
    position: 'relative',
    zIndex: 0,
  },
  wrapExpanded: {
    flex: 1,
    height: undefined,
    minHeight: 0,
    borderRadius: 0,
    borderWidth: 0,
  },
  map: {
    height: '100%',
    width: '100%',
    zIndex: 0,
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
    zIndex: OVERLAY_Z,
    elevation: OVERLAY_Z,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    flex: 1,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceWhite,
    borderWidth: 1,
    borderColor: adminColors.primary,
    minHeight: 36,
    zIndex: OVERLAY_Z,
    elevation: OVERLAY_Z,
  },
  expandBtnPressed: {
    backgroundColor: adminColors.primaryTint,
  },
  expandBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: adminColors.primary,
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
    zIndex: OVERLAY_Z,
    elevation: OVERLAY_Z,
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
    zIndex: OVERLAY_Z,
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
