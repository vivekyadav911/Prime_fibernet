import { memo, useCallback, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AttendanceRecord, AttendanceStatus } from '@/types/attendance';
import {
  buildCalendarMonthCells,
  buildDayDensityMap,
  buildStatusByDateForOfficer,
  chunkCalendarRows,
  type CalendarDayCell,
} from '@/utils/attendanceCalendarGrid';
import { isTodayLocal } from '@/utils/dateUtils';

type Props = {
  year: number;
  month: number;
  records: AttendanceRecord[];
  selectedOfficerId: string | null;
  selectedDate?: string;
  onDayPress?: (date: string) => void;
};

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_CELL_STYLES: Record<AttendanceStatus, { backgroundColor: string }> = {
  present: { backgroundColor: adminColors.attendanceCalendarCell.present },
  absent: { backgroundColor: adminColors.attendanceCalendarCell.absent },
  late: { backgroundColor: adminColors.attendanceCalendarCell.late },
  half_day: { backgroundColor: adminColors.attendanceCalendarCell.half_day },
  on_leave: { backgroundColor: adminColors.attendanceCalendarCell.on_leave },
  holiday: { backgroundColor: adminColors.attendanceCalendarCell.holiday },
};

export const AttendanceCalendar = memo(function AttendanceCalendar({
  year,
  month,
  records,
  selectedOfficerId,
  selectedDate,
  onDayPress,
}: Props) {
  const aggregateMode = selectedOfficerId === null;

  const statusByDate = useMemo(() => {
    if (aggregateMode || !selectedOfficerId) return new Map<string, AttendanceStatus>();
    return buildStatusByDateForOfficer(records, selectedOfficerId);
  }, [aggregateMode, records, selectedOfficerId]);

  const densityByDate = useMemo(() => {
    if (!aggregateMode) return new Map();
    return buildDayDensityMap(records);
  }, [aggregateMode, records]);

  const rows = useMemo(() => {
    const cells = buildCalendarMonthCells(year, month, statusByDate, densityByDate);
    return chunkCalendarRows(cells);
  }, [densityByDate, month, statusByDate, year]);

  const renderDensityBar = useCallback((cell: CalendarDayCell) => {
    if (!cell.density || cell.density.total === 0) return null;

    const presentRatio = cell.density.present / cell.density.total;
    const absentRatio = cell.density.absent / cell.density.total;

    return (
      <View style={styles.densityWrap}>
        <View style={styles.densityTrack}>
          {presentRatio > 0 ? (
            <View
              style={[
                styles.densitySegment,
                styles.densityPresent,
                { flex: presentRatio },
              ]}
            />
          ) : null}
          {absentRatio > 0 ? (
            <View
              style={[
                styles.densitySegment,
                styles.densityAbsent,
                { flex: absentRatio },
              ]}
            />
          ) : null}
        </View>
        <Text style={styles.densityCount}>
          {cell.density.present}/{cell.density.total}
        </Text>
      </View>
    );
  }, []);

  const renderCell = useCallback(
    (cell: CalendarDayCell, cellIndex: number) => {
      const isToday = isTodayLocal(cell.date);
      const isSelected = selectedDate === cell.date;
      const disabled = !cell.inMonth;
      const statusStyle = cell.status ? STATUS_CELL_STYLES[cell.status] : undefined;
      const isHoliday = cell.status === 'holiday';

      let backgroundStyle;
      if (!cell.inMonth) {
        backgroundStyle = styles.outsideMonthCell;
      } else if (statusStyle) {
        backgroundStyle = statusStyle;
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
            disabled={disabled}
            style={[
              styles.cell,
              backgroundStyle,
              isToday && styles.todayCell,
              isSelected && styles.selectedCell,
            ]}
            onPress={() => onDayPress?.(cell.date)}
          >
            <Text
              style={[
                styles.dayNum,
                cell.status && !isHoliday ? styles.dayNumActive : undefined,
                isHoliday ? styles.dayNumHoliday : undefined,
                !cell.inMonth && styles.outsideMonthText,
                isToday && !cell.status && styles.todayText,
                isSelected && !cell.status && styles.selectedText,
                isSelected && cell.status && !isHoliday && styles.selectedTextOnFill,
              ]}
            >
              {cell.day}
            </Text>
            {aggregateMode && cell.inMonth ? renderDensityBar(cell) : null}
          </Pressable>
        </View>
      );
    },
    [aggregateMode, onDayPress, renderDensityBar, selectedDate],
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
        {(Object.keys(STATUS_CELL_STYLES) as AttendanceStatus[]).map((status) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendDot, STATUS_CELL_STYLES[status]]} />
            <Text style={styles.legendText}>{status.replace('_', ' ')}</Text>
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
  weekendCell: {
    backgroundColor: adminColors.attendanceCalendarCell.weekendEmpty,
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
  densityPresent: {
    backgroundColor: adminColors.attendanceCalendarCell.densityPresent,
  },
  densityAbsent: {
    backgroundColor: adminColors.attendanceCalendarCell.densityAbsent,
  },
  densityCount: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
