import { StyleSheet, Text, View } from 'react-native';

import { useLiveGeofenceStatus } from '@/hooks/attendance/useAttendance';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export function GeofenceStatusBanner() {
  const geo = useLiveGeofenceStatus();

  if (geo.isLoading && geo.geofences.length === 0) {
    return (
      <View style={[styles.banner, styles.neutral]}>
        <Text style={styles.neutralText}>Loading assigned zones…</Text>
      </View>
    );
  }

  if (geo.geofences.length === 0) {
    return (
      <View style={[styles.banner, styles.warn]}>
        <Text style={styles.warnText}>
          No zone assigned — contact your admin to assign a geofence.
        </Text>
      </View>
    );
  }

  if (!geo.currentLocation) {
    return (
      <View style={[styles.banner, styles.warn]}>
        <Text style={styles.warnText}>
          Location unavailable — enable GPS to check in.
        </Text>
      </View>
    );
  }

  if (geo.isInsideGeofence) {
    const zoneName = geo.activeGeofence?.name ?? 'office zone';
    return (
      <View style={[styles.banner, styles.ok]}>
        <Text style={styles.okText}>
          Inside {zoneName}. You can check in.
        </Text>
      </View>
    );
  }

  const dist =
    geo.distanceFromFence < 1000
      ? `${Math.round(geo.distanceFromFence)}m`
      : `${(geo.distanceFromFence / 1000).toFixed(1)}km`;

  const zoneName = geo.activeGeofence?.name ?? 'office';

  return (
    <View style={[styles.banner, styles.warn]}>
      <Text style={styles.warnText}>
        Outside {zoneName} — {dist} away. Move into the zone or request approval.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  ok: { backgroundColor: colors.emeraldLight },
  warn: { backgroundColor: colors.amberLight },
  neutral: { backgroundColor: colors.surfaceWhite, borderWidth: 1, borderColor: colors.borderDefault },
  okText: { color: colors.emerald, fontWeight: '600', fontSize: 14 },
  warnText: { color: colors.amber, fontWeight: '600', fontSize: 14 },
  neutralText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
});
