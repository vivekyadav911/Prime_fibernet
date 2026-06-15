import { StyleSheet, Text, View } from 'react-native';

import { useLiveGeofenceStatus } from '@/hooks/attendance/useAttendance';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export function GeofenceStatusBanner() {
  const geo = useLiveGeofenceStatus();

  if (geo.isInsideGeofence) {
    return (
      <View style={[styles.banner, styles.ok]}>
        <Text style={styles.okText}>
          ✅ You&apos;re within the office zone. You can check in.
        </Text>
      </View>
    );
  }

  const dist =
    geo.distanceFromFence < 1000
      ? `${Math.round(geo.distanceFromFence)}m`
      : `${(geo.distanceFromFence / 1000).toFixed(1)}km`;

  return (
    <View style={[styles.banner, styles.warn]}>
      <Text style={styles.warnText}>
        📍 You&apos;re {dist} from the office. Check-in requires presence within the zone.
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
  okText: { color: colors.emerald, fontWeight: '600', fontSize: 14 },
  warnText: { color: colors.amber, fontWeight: '600', fontSize: 14 },
});
