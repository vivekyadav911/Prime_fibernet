import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useGetAttendanceHistoryQuery } from '@/services/api/attendanceApi';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type MonthCalendarProps = {
  month: number;
  year: number;
};

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function MonthCalendar({ month, year }: MonthCalendarProps) {
  const { data: records } = useGetAttendanceHistoryQuery({ month, year });
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);

  const byDate = useMemo(() => {
    const map = new Map<string, string>();
    (records ?? []).forEach((r) => {
      if (r.date) map.set(r.date, r.status ?? (r.checkInTime ? 'present' : 'absent'));
    });
    return map;
  }, [records]);

  const firstDow = new Date(year, month - 1, 1).getDay();
  const totalDays = daysInMonth(month, year);
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  const dotFor = (day: number): string => {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (key === todayKey) return '●';
    const status = byDate.get(key);
    if (status === 'present' || status === 'approved') return '✓';
    if (status === 'on_leave') return 'L';
    if (status === 'absent') return 'A';
    return '·';
  };

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>This Month</Text>
      <View style={styles.headerRow}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <Text key={d} style={styles.dow}>
            {d}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {Array.from({ length: 7 }, (_, di) => {
            const day = week[di] ?? null;
            return (
              <View key={di} style={styles.cell}>
                {day != null ? (
                  <>
                    <Text style={styles.dayNum}>{day}</Text>
                    <Text style={styles.dot}>{dotFor(day)}</Text>
                  </>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  title: { fontWeight: '700', color: colors.primaryNavy, marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', marginBottom: spacing.xs },
  dow: { flex: 1, textAlign: 'center', fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  weekRow: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: spacing.xs, minHeight: 40 },
  dayNum: { fontSize: 11, color: colors.textSecondary },
  dot: { fontSize: 14, fontWeight: '700', color: colors.accentTeal },
});
