import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useGetAttendanceHistoryQuery } from '@/services/api/attendanceApi';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AttendanceStatus } from '@/types/attendance';

type MonthCalendarProps = {
  month: number;
  year: number;
};

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function markerForStatus(status: AttendanceStatus | undefined): string | null {
  switch (status) {
    case 'present':
      return '✓';
    case 'late':
      return '●';
    case 'absent':
      return 'A';
    case 'on_leave':
      return 'L';
    case 'half_day':
      return '½';
    default:
      return null;
  }
}

function markerColor(status: AttendanceStatus | undefined): string {
  switch (status) {
    case 'present':
      return colors.emerald;
    case 'late':
      return colors.amber;
    case 'absent':
      return colors.errorRed;
    case 'on_leave':
      return colors.textSecondary;
    default:
      return colors.accentTeal;
  }
}

export function MonthCalendar({ month, year }: MonthCalendarProps) {
  const { data: records } = useGetAttendanceHistoryQuery({ month, year });
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const byDate = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    (records ?? []).forEach((r) => {
      if (!r.date) return;
      const status = (r.status ?? (r.checkInTime ? 'present' : 'absent')) as AttendanceStatus;
      map.set(r.date, status);
    });
    return map;
  }, [records]);

  const firstDow = new Date(year, month - 1, 1).getDay();
  const totalDays = daysInMonth(month, year);
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  const markerForDay = (day: number): { symbol: string; color: string } | null => {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (key > todayKey) return null;
    const status = byDate.get(key);
    if (!status) return null;
    const symbol = markerForStatus(status);
    if (!symbol) return null;
    return { symbol, color: markerColor(status) };
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
            const marker = day != null ? markerForDay(day) : null;
            const key = `${year}-${month}-${day ?? 'blank'}-${di}`;
            return (
              <View key={key} style={styles.cell}>
                {day != null ? (
                  <>
                    <Text style={styles.dayNum}>{day}</Text>
                    {marker ? (
                      <Text style={[styles.dot, { color: marker.color }]}>{marker.symbol}</Text>
                    ) : (
                      <Text style={styles.dotPlaceholder}> </Text>
                    )}
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
  dot: { fontSize: 14, fontWeight: '700' },
  dotPlaceholder: { fontSize: 14, opacity: 0 },
});
