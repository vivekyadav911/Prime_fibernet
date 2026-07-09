import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AttendanceRecord } from '@/types/attendance';
import { formatAttendanceDuration } from '@/utils/attendanceDuration';
import type { AttendanceStatusDayRow } from '@/utils/attendanceStatus';
import { parseLocalDateString } from '@/utils/dateUtils';

type AttendanceHistoryListItemProps = {
  row: AttendanceStatusDayRow;
  record?: AttendanceRecord | null;
};

function formatTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDisplayDate(iso: string): string {
  return parseLocalDateString(iso).toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function AttendanceHistoryListItem({ row, record }: AttendanceHistoryListItemProps) {
  const checkIn = record?.checkInTime ?? row.checkInTime;
  const checkOut = record?.checkOutTime ?? row.checkOutTime;
  const workingHours = record?.workingHours;
  const duration =
    workingHours != null
      ? `${workingHours}h`
      : checkIn && checkOut
        ? formatAttendanceDuration({ checkInTime: checkIn, checkOutTime: checkOut, workingHours })
        : null;

  const metaParts: string[] = [];
  if (checkIn || checkOut) {
    metaParts.push(`In ${formatTime(checkIn)} · Out ${formatTime(checkOut)}`);
  }
  if (record?.geofenceName) {
    metaParts.push(record.geofenceName);
  } else if (row.geofenceVerified) {
    metaParts.push('Geofence verified');
  }
  if (duration) {
    metaParts.push(duration);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.date}>{formatDisplayDate(row.shiftDate)}</Text>
        <StatusBadge status={row.status} />
      </View>
      {metaParts.length > 0 ? (
        <Text style={styles.meta}>{metaParts.join(' · ')}</Text>
      ) : (
        <Text style={styles.metaMuted}>
          {row.status === 'absent'
            ? 'Marked absent — no check-in recorded'
            : row.status === 'on_leave'
              ? 'Approved leave'
              : row.status === 'holiday'
                ? 'Company holiday'
                : 'No shift activity recorded'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xxs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  date: { flex: 1, fontWeight: '700', fontSize: 14, color: colors.textPrimary },
  meta: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  metaMuted: { fontSize: 13, color: colors.textSecondary, fontStyle: 'italic' },
});
