import { StyleSheet, Text, View } from 'react-native';

import { useGetAttendanceHistoryQuery } from '@/services/api/attendanceApi';
import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/spacing';

export function AttendanceWidget() {
  const now = new Date();
  const { data: records } = useGetAttendanceHistoryQuery({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });

  const list = records ?? [];
  const present = list.filter((r) => r.status === 'present' || r.checkInTime).length;
  const total = list.length || 1;
  const pct = Math.round((present / total) * 100);

  return (
    <View style={styles.card}>
      <Text style={styles.icon}>📅</Text>
      <Text style={styles.title}>Attendance</Text>
      <Text style={styles.value}>
        {present} / {list.length || '—'} days
      </Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.card,
  },
  icon: { fontSize: 20, marginBottom: spacing.xxs },
  title: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' },
  value: { fontSize: 14, fontWeight: '700', color: colors.primaryNavy, marginVertical: spacing.xs },
  barTrack: {
    height: 6,
    backgroundColor: colors.borderDefault,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: colors.emerald },
});
