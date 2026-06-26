import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar';
import { DateField, RoleGuard, StatusBadge } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useAdminAttendance } from '@/hooks/attendance/useAdminAttendance';
import type { AttendanceRecord, CheckInMethod } from '@/types/attendance';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'AttendanceRecords'>;

const PAGE_PADDING = spacing.lg;
const CARD_RADIUS = 22;

function formatTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(hours?: number): string {
  if (hours == null || hours <= 0) return '—';
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes > 0) return `${wholeHours}h ${minutes}m`;
  return `${wholeHours}h`;
}

function formatDisplayDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function checkInMethodLabel(method: CheckInMethod): string {
  switch (method) {
    case 'geofence_auto':
      return 'Geofence verified';
    case 'manual_inside':
      return 'In zone';
    case 'approved_outside':
      return 'Outside geofence';
    case 'admin_override':
      return 'Admin override';
    default:
      return 'Location validated';
  }
}

type SummaryProps = {
  present: number;
  absent: number;
  late: number;
};

function AttendanceSummaryStrip({ present, absent, late }: SummaryProps) {
  return (
    <View style={styles.kpiStrip}>
      <View style={[styles.kpiCell, styles.kpiCellPresent]}>
        <Text style={[styles.kpiValue, styles.kpiValuePresent]}>{present}</Text>
        <Text style={styles.kpiLabel}>Present</Text>
      </View>
      <View style={styles.kpiDivider} />
      <View style={[styles.kpiCell, styles.kpiCellAbsent]}>
        <Text style={[styles.kpiValue, styles.kpiValueAbsent]}>{absent}</Text>
        <Text style={styles.kpiLabel}>Absent</Text>
      </View>
      <View style={styles.kpiDivider} />
      <View style={[styles.kpiCell, styles.kpiCellLate]}>
        <Text style={[styles.kpiValue, styles.kpiValueLate]}>{late}</Text>
        <Text style={styles.kpiLabel}>Late</Text>
      </View>
    </View>
  );
}

function AttendanceHistoryCard({ item }: { item: AttendanceRecord }) {
  const isOutsideZone = item.checkInMethod === 'approved_outside';

  return (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordName}>{item.officerName}</Text>
        <View style={styles.recordChipRow}>
          <StatusBadge status={item.status} />
          {item.isLate ? (
            <View style={[styles.chip, styles.chipWarning]}>
              <Text style={[styles.chipText, styles.chipTextWarning]}>Late</Text>
            </View>
          ) : null}
          {isOutsideZone ? (
            <View style={[styles.chip, styles.chipError]}>
              <Text style={[styles.chipText, styles.chipTextError]}>Outside zone</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.recordTimeRow}>
        <View style={styles.recordTimeCell}>
          <Text style={styles.recordTimeLabel}>Check in</Text>
          <Text style={styles.recordTimeValue}>{formatTime(item.checkInTime)}</Text>
        </View>
        <View style={styles.recordTimeDivider} />
        <View style={styles.recordTimeCell}>
          <Text style={styles.recordTimeLabel}>Check out</Text>
          <Text style={styles.recordTimeValue}>{formatTime(item.checkOutTime)}</Text>
        </View>
        <View style={styles.recordTimeDivider} />
        <View style={styles.recordTimeCell}>
          <Text style={styles.recordTimeLabel}>Duration</Text>
          <Text style={styles.recordTimeValue}>{formatDuration(item.workingHours)}</Text>
        </View>
      </View>

      <View style={styles.recordMetaRow}>
        <Text style={styles.recordMeta} numberOfLines={1}>
          {item.geofenceName || 'Unassigned zone'}
        </Text>
        <Text style={styles.recordMetaDot}>·</Text>
        <Text style={styles.recordMeta} numberOfLines={1}>
          {checkInMethodLabel(item.checkInMethod)}
        </Text>
      </View>

      {item.lateByMinutes != null && item.lateByMinutes > 0 ? (
        <Text style={styles.recordLateNote}>Late by {item.lateByMinutes} min</Text>
      ) : null}
    </View>
  );
}

function RecordsEmptyState({ date }: { date: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>No attendance records</Text>
      <Text style={styles.emptySubtitle}>
        No officer sessions were logged for {formatDisplayDate(date)}. Try another date or check
        back after check-ins are recorded.
      </Text>
    </View>
  );
}

export function AttendanceRecordsScreenEnhanced(_props: Props) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const selectedDate = new Date(date);
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminAttendance({ date });

  const records = data ?? [];
  const counts = useMemo(
    () => ({
      present: records.filter((r) => r.status === 'present').length,
      absent: records.filter((r) => r.status === 'absent' || !r.checkInTime).length,
      late: records.filter((r) => r.status === 'late' || r.isLate).length,
    }),
    [records],
  );

  const renderItem = useCallback(
    ({ item }: { item: AttendanceRecord }) => <AttendanceHistoryCard item={item} />,
    [],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <View style={styles.filterCard}>
          <DateField label="Date" value={date} onChange={setDate} placeholder="Select date" />
          <Pressable
            accessibilityRole="button"
            onPress={() => setViewMode((v) => (v === 'list' ? 'calendar' : 'list'))}
            style={({ pressed }) => [styles.viewToggle, pressed && styles.viewTogglePressed]}
          >
            <Text style={styles.viewToggleText}>
              {viewMode === 'list' ? 'Calendar view' : 'List view'}
            </Text>
          </Pressable>
        </View>

        <AttendanceSummaryStrip
          present={counts.present}
          absent={counts.absent}
          late={counts.late}
        />

        {viewMode === 'calendar' ? (
          <View style={styles.calendarCard}>
            <AttendanceCalendar
              year={selectedDate.getFullYear()}
              month={selectedDate.getMonth() + 1}
              records={records.map((r) => ({ date: r.date, status: r.status }))}
            />
          </View>
        ) : (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Records</Text>
            <Text style={styles.sectionCount}>{records.length} officer(s)</Text>
          </View>
        )}
      </View>
    ),
    [counts.absent, counts.late, counts.present, date, records, selectedDate, viewMode],
  );

  if (isLoading) {
    return (
      <Screen safeAreaTop={false}>
        <SkeletonLoader rows={8} shape="card" />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen safeAreaTop={false} style={adminScreenStyles.canvas}>
        <View style={styles.stateCard}>
          <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
        </View>
      </Screen>
    );
  }

  return (
    <RoleGuard requiredPermission="attendance.view">
      <Screen padded={false} safeAreaTop={false} style={adminScreenStyles.canvas}>
        {viewMode === 'calendar' ? (
          <FlatList
            data={[]}
            keyExtractor={() => 'calendar'}
            renderItem={() => null}
            ListHeaderComponent={listHeader}
            contentContainerStyle={adminScreenStyles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={isFetching}
            onRefresh={refetch}
          />
        ) : (
          <FlatList
            data={records}
            keyExtractor={(r) => r.id}
            renderItem={renderItem}
            ListHeaderComponent={listHeader}
            contentContainerStyle={adminScreenStyles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={isFetching}
            onRefresh={refetch}
            ListEmptyComponent={<RecordsEmptyState date={date} />}
          />
        )}
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  listHeader: { gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  filterCard: {
    backgroundColor: adminColors.cardBg,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    gap: spacing.sm,
  },
  viewToggle: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  viewTogglePressed: { opacity: 0.7 },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: adminColors.primary,
  },
  kpiStrip: {
    flexDirection: 'row',
    backgroundColor: adminColors.cardBg,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
  },
  kpiCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    gap: 2,
  },
  kpiCellPresent: { backgroundColor: '#F8FDFB' },
  kpiCellAbsent: { backgroundColor: '#FEF8F8' },
  kpiCellLate: { backgroundColor: '#FFFCF5' },
  kpiDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderDefault,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
    lineHeight: 32,
    color: colors.textPrimary,
  },
  kpiValuePresent: { color: adminColors.badgeActive },
  kpiValueAbsent: { color: adminColors.badgeBlocked },
  kpiValueLate: { color: adminColors.badgePending },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  calendarCard: {
    backgroundColor: adminColors.cardBg,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: spacing.xxs,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  recordCard: {
    backgroundColor: adminColors.cardBg,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  recordHeader: { gap: spacing.xs },
  recordName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  recordChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chipWarning: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  chipError: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextWarning: { color: '#B45309' },
  chipTextError: { color: '#B91C1C' },
  recordTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  recordTimeCell: { flex: 1, alignItems: 'center', gap: 2 },
  recordTimeDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: colors.borderDefault,
  },
  recordTimeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  recordTimeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  recordMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recordMeta: {
    flexShrink: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  recordMetaDot: { fontSize: 13, color: colors.textSecondary },
  recordLateNote: {
    fontSize: 12,
    fontWeight: '600',
    color: adminColors.badgePending,
  },
  emptyCard: {
    backgroundColor: adminColors.cardBg,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  stateCard: {
    flex: 1,
    margin: PAGE_PADDING,
    backgroundColor: adminColors.cardBg,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    justifyContent: 'center',
  },
});
