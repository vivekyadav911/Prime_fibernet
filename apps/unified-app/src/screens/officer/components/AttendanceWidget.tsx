import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useOfficerMonthAttendance } from '@/hooks/attendance/useAttendance';
import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/spacing';
import { getLocalDateString } from '@/utils/dateUtils';

export function AttendanceWidget() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const todayIso = getLocalDateString();
  const daysElapsed = now.getDate();

  const { statusRows } = useOfficerMonthAttendance(month, year);

  const presentDays = useMemo(
    () =>
      statusRows.filter(
        (row) =>
          row.shiftDate <= todayIso &&
          (row.status === 'present' || row.status === 'late'),
      ).length,
    [statusRows, todayIso],
  );

  const pct = daysElapsed > 0 ? Math.round((presentDays / daysElapsed) * 100) : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.icon}>📅</Text>
      <Text style={styles.title}>Attendance</Text>
      <Text style={styles.value}>
        {presentDays} / {daysElapsed} days
      </Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
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
