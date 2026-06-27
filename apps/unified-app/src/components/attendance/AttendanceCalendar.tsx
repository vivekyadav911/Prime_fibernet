import { memo, useCallback, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AttendanceStatus } from '@/types/attendance';
import {
  buildCalendarMonthCells,
  chunkCalendarRows,
  type CalendarDayCell,
} from '@/utils/attendanceCalendarGrid';
import { isTodayLocal } from '@/utils/dateUtils';

type Props = {
  year: number;
  month: number;
  records: { date: string; status: AttendanceStatus }[];
  selectedDate?: string;
  onDayPress?: (date: string) => void;
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CELL_WIDTH = `${100 / 7}%`;

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: colors.successGreen,
  absent: colors.errorRed,
  late: colors.warningAmber,
  half_day: colors.accentTeal,
  on_leave: colors.primaryNavy,
  holiday: colors.borderDefault,
};

export const AttendanceCalendar = memo(function AttendanceCalendar({
  year,
  month,
  records,
  selectedDate,
  onDayPress,
}: Props) {
  const statusByDate = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    records.forEach((r) => map.set(r.date, r.status));
    return map;
  }, [records]);

  const rows = useMemo(() => {
    const cells = buildCalendarMonthCells(year, month, statusByDate);
    return chunkCalendarRows(cells);
  }, [month, statusByDate, year]);

  const renderCell = useCallback(
    (cell: CalendarDayCell) => {
      const isToday = isTodayLocal(cell.date);
      const isSelected = selectedDate === cell.date;
      const disabled = !cell.inMonth;

      return (
        <View key={cell.date} style={styles.cellSlot}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            style={[
              styles.cell,
              cell.status ? { backgroundColor: STATUS_COLORS[cell.status] } : styles.emptyCell,
              !cell.inMonth && styles.outsideMonthCell,
              isToday && styles.todayCell,
              isSelected && styles.selectedCell,
            ]}
            onPress={() => onDayPress?.(cell.date)}
          >
            <Text
              style={[
                styles.dayNum,
                cell.status ? styles.dayNumActive : undefined,
                !cell.inMonth && styles.outsideMonthText,
                isToday && !cell.status && styles.todayText,
                isSelected && !cell.status && styles.selectedText,
                isSelected && cell.status && styles.selectedTextOnFill,
              ]}
            >
              {cell.day}
            </Text>
          </Pressable>
        </View>
      );
    },
    [onDayPress, selectedDate],
  );

  return (
    <View style={styles.container}>
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} style={styles.cellSlot}>
            <Text style={styles.weekdayLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        {(Object.keys(STATUS_COLORS) as AttendanceStatus[]).map((s) => (
          <View key={s} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS[s] }]} />
            <Text style={styles.legendText}>{s.replace('_', ' ')}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.weekRow}>
            {row.map(renderCell)}
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.sm, width: '100%' },
  weekdayRow: {
    flexDirection: 'row',
    width: '100%',
  },
  weekdayLabel: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: colors.textSecondary, textTransform: 'capitalize' },
  grid: { width: '100%' },
  weekRow: {
    flexDirection: 'row',
    width: '100%',
  },
  cellSlot: {
    width: CELL_WIDTH,
    padding: 2,
    ...(Platform.OS === 'web'
      ? ({ flexShrink: 0, flexGrow: 0, boxSizing: 'border-box' } as object)
      : null),
  },
  cell: {
    width: '100%',
    minHeight: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCell: {
    backgroundColor: colors.surfaceWhite,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  outsideMonthCell: {
    opacity: 0.35,
    backgroundColor: colors.background,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: colors.primaryNavy,
  },
  selectedCell: {
    borderWidth: 2,
    borderColor: colors.accentTeal,
  },
  dayNum: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  dayNumActive: { color: colors.white, fontWeight: '700' },
  outsideMonthText: { color: colors.textSecondary },
  todayText: { fontWeight: '800', color: colors.primaryNavy },
  selectedText: { fontWeight: '800', color: colors.primaryNavy },
  selectedTextOnFill: { fontWeight: '800', color: colors.white },
});
