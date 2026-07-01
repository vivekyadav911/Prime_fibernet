import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { CalendarDayCell } from '@/types/payslip';
import { breakdownToCalendarCells } from '@/types/payslip';
import type { PayslipDailyBreakdown } from '@/types/payslip';

const CELL_BG_MAP: Record<CalendarDayCell['colorKey'], string> = {
  present: colors.emeraldLight,
  half_day: colors.amberLight,
  quarter_day: colors.amberLight,
  partial: '#E0F7FA',
  absent: colors.redLight,
  weekly_off: colors.surfaceWhite,
  holiday: '#DBEAFE',
  leave: '#EDE9FE',
  extra: '#DCFCE7',
};

const CELL_TEXT_MAP: Record<CalendarDayCell['colorKey'], string> = {
  present: colors.successGreen,
  half_day: colors.warningAmber,
  quarter_day: colors.warningAmber,
  partial: colors.accentTeal,
  absent: colors.errorRed,
  weekly_off: colors.textSecondary,
  holiday: colors.primaryNavy,
  leave: '#7c3aed',
  extra: '#15803d',
};

const SYMBOL_MAP: Record<CalendarDayCell['colorKey'], string> = {
  present: '✓',
  half_day: '½',
  quarter_day: '¼',
  partial: '·',
  absent: '✕',
  weekly_off: '—',
  holiday: '★',
  leave: 'L',
  extra: '✓+',
};

type Props = {
  year: number;
  month: number;
  breakdown: PayslipDailyBreakdown[];
  onDayPress?: (date: string) => void;
  accent?: 'admin' | 'officer';
};

export const PayslipTimesheetCalendar = memo(function PayslipTimesheetCalendar({
  year,
  month,
  breakdown,
  onDayPress,
  accent = 'admin',
}: Props) {
  const cells = useMemo(
    () => breakdownToCalendarCells(breakdown, year, month),
    [breakdown, year, month],
  );

  const firstDow = new Date(year, month - 1, 1).getDay();
  const gridCells: (CalendarDayCell | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...cells,
  ];
  const weeks: (CalendarDayCell | null)[][] = [];
  for (let i = 0; i < gridCells.length; i += 7) {
    weeks.push(gridCells.slice(i, i + 7));
  }

  const accentColor = accent === 'admin' ? adminColors.primary : colors.primaryNavy;

  const renderCell = useCallback(
    (cell: CalendarDayCell | null, index: number) => {
      if (!cell) {
        return <View key={`empty-${index}`} style={styles.cell} />;
      }
      const bg = CELL_BG_MAP[cell.colorKey];
      const textColor = CELL_TEXT_MAP[cell.colorKey];
      const symbol = SYMBOL_MAP[cell.colorKey];
      const hasFill = cell.colorKey !== 'weekly_off' && cell.displayLabel !== '';

      return (
        <Pressable
          key={cell.date}
          style={[
            styles.cell,
            hasFill ? { backgroundColor: bg } : styles.emptyCell,
          ]}
          onPress={() => onDayPress?.(cell.date)}
        >
          <Text style={[styles.dayNum, hasFill && { color: textColor, fontWeight: '600' }]}>
            {cell.day}
          </Text>
          <Text style={[styles.symbol, hasFill && { color: textColor }]}>{symbol}</Text>
          {cell.actualHours > 0 ? (
            <Text style={[styles.hours, hasFill && { color: textColor }]}>{cell.actualHours}h</Text>
          ) : null}
        </Pressable>
      );
    },
    [onDayPress],
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: accentColor }]}>Timesheet</Text>
      <View style={styles.headerRow}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <Text key={d} style={styles.dow}>
            {d}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {Array.from({ length: 7 }, (_, di) => renderCell(week[di] ?? null, di))}
        </View>
      ))}
      <View style={styles.legend}>
        {(Object.keys(CELL_BG_MAP) as CalendarDayCell['colorKey'][]).map((key) => (
          <View key={key} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: CELL_BG_MAP[key], borderColor: CELL_TEXT_MAP[key] },
              ]}
            />
            <Text style={[styles.legendText, { color: CELL_TEXT_MAP[key] }]}>
              {key.replace('_', ' ')}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.sm,
  },
  title: { fontWeight: '700', fontSize: 14 },
  headerRow: { flexDirection: 'row' },
  dow: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  weekRow: { flexDirection: 'row' },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    minHeight: 48,
    borderRadius: radius.sm,
    margin: 1,
  },
  emptyCell: {
    backgroundColor: colors.surfaceWhite,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  dayNum: { fontSize: 10, color: colors.textPrimary },
  symbol: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  hours: { fontSize: 8, color: colors.textPrimary },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1 },
  legendText: { fontSize: 9, fontWeight: '600', textTransform: 'capitalize' },
});
