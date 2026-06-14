import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AttendanceStatus } from '@/types/attendance';

type DayCell = {
  date: string;
  day: number;
  status?: AttendanceStatus;
};

type Props = {
  year: number;
  month: number;
  records: { date: string; status: AttendanceStatus }[];
  onDayPress?: (date: string) => void;
};

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: colors.successGreen,
  absent: colors.errorRed,
  late: colors.warningAmber,
  half_day: colors.accentTeal,
  on_leave: colors.primaryNavy,
  holiday: colors.borderDefault,
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export const AttendanceCalendar = memo(function AttendanceCalendar({
  year,
  month,
  records,
  onDayPress,
}: Props) {
  const statusByDate = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    records.forEach((r) => map.set(r.date, r.status));
    return map;
  }, [records]);

  const cells = useMemo((): DayCell[] => {
    const days = getDaysInMonth(year, month);
    const monthStr = String(month).padStart(2, '0');
    return Array.from({ length: days }, (_, i) => {
      const day = i + 1;
      const date = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;
      return { date, day, status: statusByDate.get(date) };
    });
  }, [year, month, statusByDate]);

  const renderCell = useCallback(
    (cell: DayCell) => (
      <Pressable
        key={cell.date}
        style={[styles.cell, cell.status ? { backgroundColor: STATUS_COLORS[cell.status] } : styles.emptyCell]}
        onPress={() => onDayPress?.(cell.date)}
      >
        <Text style={[styles.dayNum, cell.status ? styles.dayNumActive : undefined]}>{cell.day}</Text>
      </Pressable>
    ),
    [onDayPress],
  );

  return (
    <View style={styles.container}>
      <View style={styles.legend}>
        {(Object.keys(STATUS_COLORS) as AttendanceStatus[]).map((s) => (
          <View key={s} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS[s] }]} />
            <Text style={styles.legendText}>{s.replace('_', ' ')}</Text>
          </View>
        ))}
      </View>
      <View style={styles.grid}>{cells.map(renderCell)}</View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: colors.textSecondary, textTransform: 'capitalize' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs },
  cell: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCell: { backgroundColor: colors.surfaceWhite, borderWidth: 1, borderColor: colors.borderDefault },
  dayNum: { fontSize: 12, color: colors.textSecondary },
  dayNumActive: { color: colors.white, fontWeight: '700' },
});
