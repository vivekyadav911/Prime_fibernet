import { StyleSheet, Text, View } from 'react-native';

import { useMyAssignedZones } from '@/hooks/attendance/useMyAssignedZones';
import { useLocationPermissionState } from '@/hooks/attendance/useLocationPermissionState';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { formatOutsideZoneDistance } from '@/utils/formatDistance';

export function GeofenceStatusBanner() {
  const zones = useMyAssignedZones();
  const { mode } = useLocationPermissionState();

  if (zones.isLoading) {
    return (
      <View style={[styles.banner, styles.neutral]}>
        <Text style={styles.neutralText}>Loading assigned zones…</Text>
      </View>
    );
  }

  if (!zones.hasZone) {
    return (
      <View style={[styles.banner, styles.warn]}>
        <Text style={styles.warnText}>
          No zone assigned — contact your admin. Only Request approval is available until a zone is
          assigned.
        </Text>
      </View>
    );
  }

  if (mode === 'blocked') {
    return (
      <View style={[styles.banner, styles.warn]}>
        <Text style={styles.warnText}>Location blocked — enable GPS to check in.</Text>
      </View>
    );
  }

  if (!zones.coords) {
    return (
      <View style={[styles.banner, styles.warn]}>
        <Text style={styles.warnText}>Location unavailable — enable GPS to check in.</Text>
      </View>
    );
  }

  if (zones.geofenceStatus.isInside) {
    const zoneName = zones.geofenceStatus.geofence?.name ?? zones.selectedZone?.name ?? 'zone';
    return (
      <View style={[styles.banner, styles.ok]}>
        <Text style={styles.okText}>Inside {zoneName}. You can check in.</Text>
      </View>
    );
  }

  const radiusM =
    zones.selectedZone?.geometry.shape === 'circle' ? zones.selectedZone.geometry.radius : null;
  const outsideLabel = formatOutsideZoneDistance(zones.geofenceStatus.distance, radiusM);
  const zoneName = zones.selectedZone?.name ?? 'office';

  return (
    <View style={[styles.banner, styles.warn]}>
      <Text style={styles.warnText}>
        Outside {zoneName}
        {outsideLabel ? ` — ${outsideLabel}` : ''}. Move into the zone or request approval.
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
