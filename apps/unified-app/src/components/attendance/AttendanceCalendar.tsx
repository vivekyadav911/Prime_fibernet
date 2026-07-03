import { memo, useCallback, useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { CanonicalAttendanceStatus } from '@/utils/attendanceStatus';
import type { DayStatusAggregate } from '@/utils/attendanceStatus';
import {
  buildStatusByDateFromRows,
  buildDayAggregateMap,
  warnUnresolvedCalendarCells,
  type AttendanceStatusDayRow,
} from '@/utils/attendanceStatus';
import {
  buildCalendarMonthCells,
  chunkCalendarRows,
  type CalendarDayCell,
} from '@/utils/attendanceCalendarGrid';
import { isTodayLocal } from '@/utils/dateUtils';

type Props = {
  year: number;
  month: number;
  statusRows: AttendanceStatusDayRow[];
  selectedOfficerId: string | null;
  selectedDate?: string;
  onDayPress?: (date: string) => void;
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_CELL_STYLES: Record<CanonicalAttendanceStatus, { backgroundColor: string }> = {
  present: { backgroundColor: adminColors.attendanceCalendarCell.present },
  absent: { backgroundColor: adminColors.attendanceCalendarCell.absent },
  late: { backgroundColor: adminColors.attendanceCalendarCell.late },
  half_day: { backgroundColor: adminColors.attendanceCalendarCell.half_day },
  on_leave: { backgroundColor: adminColors.attendanceCalendarCell.on_leave },
  holiday: { backgroundColor: adminColors.attendanceCalendarCell.holiday },
  not_yet_recorded: { backgroundColor: adminColors.attendanceCalendarCell.not_yet_recorded },
};

const DENSITY_SEGMENTS: Array<{
  key: keyof Pick<DayStatusAggregate, 'present' | 'absent' | 'late' | 'halfDay' | 'onLeave' | 'holiday'>;
  style: { backgroundColor: string };
}> = [
  { key: 'present', style: { backgroundColor: adminColors.attendanceCalendarCell.densityPresent } },
  { key: 'late', style: { backgroundColor: adminColors.attendanceCalendarCell.densityLate } },
  { key: 'halfDay', style: { backgroundColor: adminColors.attendanceCalendarCell.densityHalfDay } },
  { key: 'onLeave', style: { backgroundColor: adminColors.attendanceCalendarCell.densityOnLeave } },
  { key: 'holiday', style: { backgroundColor: adminColors.attendanceCalendarCell.densityHoliday } },
  { key: 'absent', style: { backgroundColor: adminColors.attendanceCalendarCell.densityAbsent } },
];

function formatStatusLabel(status: CanonicalAttendanceStatus): string {
  return status === 'not_yet_recorded' ? 'pending' : status.replace('_', ' ');
}

export const AttendanceCalendar = memo(function AttendanceCalendar({
  year,
  month,
  statusRows,
  selectedOfficerId,
  selectedDate,
  onDayPress,
}: Props) {
  const aggregateMode = selectedOfficerId === null;

  const monthRows = useMemo(
    () =>
      statusRows.filter((row) => {
        const [y, m] = row.shiftDate.split('-').map(Number);
        return y === year && m === month;
      }),
    [month, statusRows, year],
  );

  const statusByDate = useMemo(() => {
    if (aggregateMode) return new Map<string, CanonicalAttendanceStatus>();
    return buildStatusByDateFromRows(monthRows);
  }, [aggregateMode, monthRows]);

  const densityByDate = useMemo(() => {
    if (!aggregateMode) return new Map<string, DayStatusAggregate>();
    return buildDayAggregateMap(monthRows);
  }, [aggregateMode, monthRows]);

  useEffect(() => {
    if (!aggregateMode) {
      warnUnresolvedCalendarCells(year, month, statusByDate);
    }
  }, [aggregateMode, month, statusByDate, year]);

  const rows = useMemo(() => {
    const cells = buildCalendarMonthCells(year, month, statusByDate, densityByDate);
    return chunkCalendarRows(cells);
  }, [densityByDate, month, statusByDate, year]);

  const renderStatusBar = useCallback((cell: CalendarDayCell) => {
    if (aggregateMode) {
      if (!cell.density || cell.density.headcount === 0) return null;

      const total = cell.density.headcount;
      const segments = DENSITY_SEGMENTS.filter((segment) => cell.density![segment.key] > 0);

      return (
        <View style={styles.densityWrap}>
          <View style={styles.densityTrack}>
            {segments.map((segment) => (
              <View
                key={segment.key}
                style={[styles.densitySegment, segment.style, { flex: cell.density![segment.key] }]}
              />
            ))}
          </View>
          <Text style={styles.densityCount}>
            {cell.density.present}/{total}
          </Text>
        </View>
      );
    }

    if (!cell.status || cell.status === 'not_yet_recorded') return null;

    return (
      <View style={styles.singleStatusDotWrap}>
        <View style={[styles.singleStatusDot, STATUS_CELL_STYLES[cell.status]]} />
      </View>
    );
  }, [aggregateMode]);

  const renderCell = useCallback(
    (cell: CalendarDayCell, cellIndex: number) => {
      const isToday = isTodayLocal(cell.date);
      const isSelected = selectedDate === cell.date;
      const disabled = !cell.inMonth;
      const statusStyle = cell.status ? STATUS_CELL_STYLES[cell.status] : undefined;
      const isHoliday = cell.status === 'holiday';
      const isPending = cell.status === 'not_yet_recorded';

      let backgroundStyle;
      if (!cell.inMonth) {
        backgroundStyle = styles.outsideMonthCell;
      } else if (statusStyle && !aggregateMode) {
        backgroundStyle = statusStyle;
      } else if (aggregateMode && statusStyle && cell.status !== 'not_yet_recorded') {
        backgroundStyle = styles.aggregateTintCell;
      } else if (isPending) {
        backgroundStyle = styles.pendingCell;
      } else if (cell.isWeekend) {
        backgroundStyle = styles.weekendCell;
      } else {
        backgroundStyle = styles.emptyCell;
      }

      return (
        <View key={`${cell.date}-${cellIndex}`} style={styles.cellSlot}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            accessibilityLabel={`${cell.day}${cell.status ? ` ${formatStatusLabel(cell.status)}` : ''}`}
            disabled={disabled}
            style={[
              styles.cell,
              backgroundStyle,
              aggregateMode && statusStyle && cell.status !== 'not_yet_recorded'
                ? { borderColor: statusStyle.backgroundColor, borderWidth: 2 }
                : null,
              isToday && styles.todayCell,
              isSelected && styles.selectedCell,
            ]}
            onPress={() => onDayPress?.(cell.date)}
          >
            <Text
              style={[
                styles.dayNum,
                cell.status && !isHoliday && !isPending && !aggregateMode
                  ? styles.dayNumActive
                  : undefined,
                isHoliday ? styles.dayNumHoliday : undefined,
                isPending ? styles.dayNumPending : undefined,
                !cell.inMonth && styles.outsideMonthText,
                isToday && !cell.status && styles.todayText,
                isSelected && !cell.status && styles.selectedText,
                isSelected && cell.status && !isHoliday && !aggregateMode && styles.selectedTextOnFill,
              ]}
            >
              {cell.day}
            </Text>
            {cell.inMonth ? renderStatusBar(cell) : null}
          </Pressable>
        </View>
      );
    },
    [aggregateMode, onDayPress, renderStatusBar, selectedDate],
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
        {(Object.keys(STATUS_CELL_STYLES) as CanonicalAttendanceStatus[]).map((status) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendDot, STATUS_CELL_STYLES[status]]} />
            <Text style={styles.legendText}>{formatStatusLabel(status)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.weekRow}>
            {row.map((cell, cellIndex) => renderCell(cell, cellIndex))}
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
    flex: 1,
    flexBasis: 0,
    padding: 2,
    ...(Platform.OS === 'web'
      ? ({ flexShrink: 0, flexGrow: 1, boxSizing: 'border-box' } as object)
      : null),
  },
  cell: {
    width: '100%',
    minHeight: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.xxs,
  },
  emptyCell: {
    backgroundColor: adminColors.attendanceCalendarCell.empty,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  pendingCell: {
    backgroundColor: adminColors.attendanceCalendarCell.not_yet_recorded,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderStyle: 'dashed',
  },
  weekendCell: {
    backgroundColor: adminColors.attendanceCalendarCell.weekendEmpty,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  aggregateTintCell: {
    backgroundColor: adminColors.attendanceCalendarCell.empty,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  outsideMonthCell: {
    opacity: 0.35,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: adminColors.primary,
  },
  selectedCell: {
    borderWidth: 2,
    borderColor: colors.accentTeal,
  },
  dayNum: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  dayNumActive: { color: colors.white, fontWeight: '700' },
  dayNumHoliday: { color: colors.textSecondary, fontWeight: '600', fontStyle: 'italic' },
  dayNumPending: { color: colors.textSecondary, fontWeight: '500' },
  outsideMonthText: { color: colors.textSecondary },
  todayText: { fontWeight: '800', color: adminColors.primary },
  selectedText: { fontWeight: '800', color: adminColors.primary },
  selectedTextOnFill: { fontWeight: '800', color: colors.white },
  densityWrap: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 3,
    gap: 1,
  },
  densityTrack: {
    flexDirection: 'row',
    height: 3,
    borderRadius: radius.full,
    overflow: 'hidden',
    backgroundColor: colors.borderDefault,
  },
  densitySegment: {
    height: '100%',
  },
  densityCount: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  singleStatusDotWrap: {
    position: 'absolute',
    bottom: 4,
  },
  singleStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
