import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AttendanceStatus } from '@/types/attendance';
import { isTodayLocal } from '@/utils/dateUtils';

type DayCell = {
  date: string;
  day: number;
  inMonth: boolean;
  status?: AttendanceStatus;
};

type Props = {
  year: number;
  month: number;
  records: { date: string; status: AttendanceStatus }[];
  selectedDate?: string;
  onDayPress?: (date: string) => void;
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

function buildMonthCells(year: number, month: number, statusByDate: Map<string, AttendanceStatus>): DayCell[] {
  const monthIndex = month - 1;
  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const monthStr = String(month).padStart(2, '0');
  const cells: DayCell[] = [];

  const prevMonthDays = getDaysInMonth(year, month === 1 ? 12 : month - 1);
  for (let i = firstWeekday - 1; i >= 0; i -= 1) {
    const day = prevMonthDays - i;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const date = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ date, day, inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;
    cells.push({ date, day, inMonth: true, status: statusByDate.get(date) });
  }

  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  let trailingDay = 1;
  while (cells.length < totalCells) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const date = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(trailingDay).padStart(2, '0')}`;
    cells.push({ date, day: trailingDay, inMonth: false });
    trailingDay += 1;
  }

  return cells;
}

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

  const cells = useMemo(
    () => buildMonthCells(year, month, statusByDate),
    [month, statusByDate, year],
  );

  const renderCell = useCallback(
    (cell: DayCell) => {
      const isToday = isTodayLocal(cell.date);
      const isSelected = selectedDate === cell.date;
      const disabled = !cell.inMonth;

      return (
        <Pressable
          key={cell.date}
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
              isToday && styles.todayText,
              isSelected && styles.selectedText,
            ]}
          >
            {cell.day}
          </Text>
        </Pressable>
      );
    },
    [onDayPress, selectedDate],
  );

  return (
    <View style={styles.container}>
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekdayLabel}>
            {label}
          </Text>
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

      <View style={styles.grid}>{cells.map(renderCell)}</View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxs,
  },
  weekdayLabel: {
    width: 40,
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxs },
  cell: {
    width: 40,
    height: 40,
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
  dayNum: { fontSize: 12, color: colors.textSecondary },
  dayNumActive: { color: colors.white, fontWeight: '700' },
  outsideMonthText: { color: colors.textSecondary },
  todayText: { fontWeight: '800', color: colors.primaryNavy },
  selectedText: { fontWeight: '700' },
});
