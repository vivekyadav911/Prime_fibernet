import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@prime/ui';

import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar';
import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { useOfficerMonthAttendance } from '@/hooks/attendance/useAttendance';
import type { OfficerDrawerParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { formatMonthYearLabel } from '@/utils/attendanceCalendarGrid';
import type { AttendanceStatusDayRow } from '@/utils/attendanceStatus';
import { queryErrorMessage } from '@/utils/queryError';

import { AttendanceHistoryListItem } from './components/AttendanceHistoryListItem';

type Props = NativeStackScreenProps<OfficerDrawerParamList, 'AttendanceHistory'>;
type ViewMode = 'calendar' | 'list';

function shiftMonth(month: number, year: number, delta: number): { month: number; year: number } {
  const date = new Date(year, month - 1 + delta, 1);
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

function canGoForward(month: number, year: number): boolean {
  const now = new Date();
  return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
}

function ViewModeChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function AttendanceHistoryScreen(_props: Props) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');

  const { statusRows, recordsByDate, counts, officerId, isLoading, isError, error, refetch } =
    useOfficerMonthAttendance(month, year);

  const listRows = useMemo(
    () =>
      [...statusRows]
        .filter((row) => row.status !== 'not_yet_recorded' || row.checkInTime)
        .sort((a, b) => b.shiftDate.localeCompare(a.shiftDate)),
    [statusRows],
  );

  const goPrevMonth = useCallback(() => {
    const next = shiftMonth(month, year, -1);
    setMonth(next.month);
    setYear(next.year);
  }, [month, year]);

  const goNextMonth = useCallback(() => {
    if (!canGoForward(month, year)) return;
    const next = shiftMonth(month, year, 1);
    setMonth(next.month);
    setYear(next.year);
  }, [month, year]);

  const renderItem = useCallback(
    ({ item }: { item: AttendanceStatusDayRow }) => (
      <AttendanceHistoryListItem row={item} record={recordsByDate.get(item.shiftDate)} />
    ),
    [recordsByDate],
  );

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={10} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.toolbar}>
        <View style={styles.monthNav}>
          <Pressable style={styles.navBtn} onPress={goPrevMonth} accessibilityLabel="Previous month">
            <Ionicons name="chevron-back" size={22} color={colors.primaryNavy} />
          </Pressable>
          <Text style={styles.monthLabel}>{formatMonthYearLabel(year, month)}</Text>
          <Pressable
            style={[styles.navBtn, !canGoForward(month, year) && styles.navBtnDisabled]}
            onPress={goNextMonth}
            disabled={!canGoForward(month, year)}
            accessibilityLabel="Next month"
          >
            <Ionicons
              name="chevron-forward"
              size={22}
              color={canGoForward(month, year) ? colors.primaryNavy : colors.textSecondary}
            />
          </Pressable>
        </View>

        <View style={styles.chipRow}>
          <ViewModeChip
            label="Calendar"
            active={viewMode === 'calendar'}
            onPress={() => setViewMode('calendar')}
          />
          <ViewModeChip
            label="List"
            active={viewMode === 'list'}
            onPress={() => setViewMode('list')}
          />
        </View>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryText}>Present: {counts.present + counts.late}</Text>
        <Text style={styles.summaryText}>Absent: {counts.absent}</Text>
        <Text style={styles.summaryText}>Leave: {counts.onLeave + counts.halfDay}</Text>
        <Text style={styles.summaryText}>Holiday: {counts.holiday}</Text>
      </View>

      {viewMode === 'calendar' ? (
        <View style={styles.calendarWrap}>
          <AttendanceCalendar
            year={year}
            month={month}
            statusRows={statusRows}
            selectedOfficerId={officerId}
          />
        </View>
      ) : (
        <FlatList
          data={listRows}
          keyExtractor={(item) => item.shiftDate}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              title="No records this month"
              subtitle="Attendance, absences, and approved leave appear here once recorded."
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.4 },
  monthLabel: { fontSize: 18, fontWeight: '700', color: colors.primaryNavy },
  chipRow: { flexDirection: 'row', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceWhite,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primaryNavy, borderColor: colors.primaryNavy },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.white },
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  summaryText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  calendarWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
});
