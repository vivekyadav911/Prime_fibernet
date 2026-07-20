import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { Geofence, OfficerLiveLocation } from '@/types/attendance';
import { formatSyncLabel } from '@/utils/dateUtils';
import { buildLiveOfficerLeafletHtml } from '@/utils/leafletWebViewHtml';

const MAP_HEIGHT_COLLAPSED = 228;

type Props = {
  locations: OfficerLiveLocation[];
  geofences?: Geofence[];
  siteLabel?: string;
  lastSync?: string;
  inGeofenceCount?: number;
  geofenceActive?: boolean;
  focusOfficerId?: string | null;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  onOfficerFocus?: (officerId: string) => void;
};

/**
 * Native live-attendance map via Leaflet WebView (same OSM path as web).
 * Avoids Android Google Maps SDK / API-key requirement of react-native-maps.
 */
export function LiveOfficerMap({
  locations,
  geofences = [],
  siteLabel = 'Monitoring all zones',
  lastSync,
  inGeofenceCount = 0,
  geofenceActive = false,
  focusOfficerId = null,
  expanded = false,
}: Props) {
  const html = useMemo(
    () =>
      buildLiveOfficerLeafletHtml({
        locations,
        geofences,
        focusOfficerId,
      }),
    [focusOfficerId, geofences, locations],
  );
  const sync = formatSyncLabel(lastSync);

  return (
    <View style={[styles.wrap, expanded ? styles.wrapExpanded : null]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        mixedContentMode="always"
      />

      <View style={styles.mapOverlayTop} pointerEvents="none">
        <View style={styles.chip}>
          <Text style={styles.chipText}>
            {geofenceActive ? 'Geofence active' : 'Geofence inactive'}
          </Text>
        </View>
        {inGeofenceCount > 0 ? (
          <View style={[styles.chip, styles.chipInfo]}>
            <Text style={[styles.chipText, styles.chipInfoText]}>
              {inGeofenceCount} in zone
            </Text>
          </View>
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
  },
  wrapExpanded: {
    flex: 1,
    height: undefined,
    minHeight: 0,
    borderRadius: 0,
    borderWidth: 0,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: adminColors.cardBg,
  },
  mapOverlayTop: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: adminColors.chipTones.success.border,
    backgroundColor: adminColors.chipTones.success.bg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chipInfo: {
    borderColor: adminColors.chipTones.info.border,
    backgroundColor: adminColors.chipTones.info.bg,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: adminColors.chipTones.success.text,
  },
  chipInfoText: {
    color: adminColors.chipTones.info.text,
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
