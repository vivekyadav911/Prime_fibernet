import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar';
import { DateField, RoleGuard, StatusBadge } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useAdminAttendance } from '@/hooks/attendance/useAdminAttendance';
import { setAdminRecordsPrefs } from '@/store/slices/attendanceSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { AttendanceRecord, CheckInMethod } from '@/types/attendance';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { shareAttendanceCsv, shareAttendancePdf } from '@/utils/attendanceExport';
import { getLocalDateString } from '@/utils/dateUtils';
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

function AttendanceSummaryStrip({
  present,
  absent,
  late,
}: {
  present: number;
  absent: number;
  late: number;
}) {
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
  const isManual = item.checkInMethod === 'admin_override' || Boolean(item.manualEntryByName);

  return (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordName}>{item.officerName || 'Unknown officer'}</Text>
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
          {isManual ? (
            <View style={[styles.chip, styles.chipInfo]}>
              <Text style={[styles.chipText, styles.chipTextInfo]}>Manual entry</Text>
            </View>
          ) : null}
        </View>
      </View>

      {item.manualEntryByName ? (
        <Text style={styles.manualNote}>
          Manually entered by {item.manualEntryByName}
          {item.manualEntryReason ? ` — ${item.manualEntryReason}` : ''}
        </Text>
      ) : null}

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
    </View>
  );
}

export function AttendanceRecordsScreenEnhanced({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const prefs = useAppSelector((s) => s.attendance.adminRecordsPrefs);
  const { viewMode, selectedDate, dateFrom, dateTo, useDateRange } = prefs;

  const queryArgs = useMemo(
    () =>
      useDateRange
        ? { from: dateFrom, to: dateTo }
        : { date: selectedDate },
    [dateFrom, dateTo, selectedDate, useDateRange],
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useAdminAttendance(queryArgs);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  const records = data ?? [];
  const counts = useMemo(
    () => ({
      present: records.filter((r) => r.status === 'present').length,
      absent: records.filter((r) => r.status === 'absent' || !r.checkInTime).length,
      late: records.filter((r) => r.status === 'late' || r.isLate).length,
    }),
    [records],
  );

  const rangeLabel = useDateRange ? `${dateFrom} to ${dateTo}` : selectedDate;

  const updatePrefs = useCallback(
    (patch: Partial<typeof prefs>) => {
      dispatch(setAdminRecordsPrefs(patch));
    },
    [dispatch, prefs],
  );

  const handleCalendarDayPress = useCallback(
    (date: string) => {
      updatePrefs({ selectedDate: date, viewMode: 'list', useDateRange: false });
    },
    [updatePrefs],
  );

  const handleExportCsv = useCallback(async () => {
    setExporting('csv');
    try {
      await shareAttendanceCsv(records, rangeLabel.replace(/\s/g, '_'));
    } catch (e) {
      Alert.alert('Export failed', queryErrorMessage(e));
    } finally {
      setExporting(null);
    }
  }, [rangeLabel, records]);

  const handleExportPdf = useCallback(async () => {
    setExporting('pdf');
    try {
      await shareAttendancePdf(records, rangeLabel);
    } catch (e) {
      Alert.alert('Export failed', queryErrorMessage(e));
    } finally {
      setExporting(null);
    }
  }, [rangeLabel, records]);

  const renderItem = useCallback(
    ({ item }: { item: AttendanceRecord }) => <AttendanceHistoryCard item={item} />,
    [],
  );

  const listHeader = useMemo(() => {
    const selected = new Date(selectedDate);

    return (
      <View style={styles.listHeader}>
        <View style={styles.filterCard}>
          <View style={styles.rangeToggleRow}>
            <Text style={styles.rangeToggleLabel}>Date range</Text>
            <Switch
              value={useDateRange}
              onValueChange={(v) => updatePrefs({ useDateRange: v })}
              trackColor={{ true: adminColors.primary }}
            />
          </View>

          {useDateRange ? (
            <>
              <DateField label="From" value={dateFrom} onChange={(v) => updatePrefs({ dateFrom: v })} />
              <DateField label="To" value={dateTo} onChange={(v) => updatePrefs({ dateTo: v })} />
            </>
          ) : (
            <DateField
              label="Date"
              value={selectedDate}
              onChange={(v) => updatePrefs({ selectedDate: v })}
              placeholder="Select date"
            />
          )}

          <View style={styles.toolbarRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => updatePrefs({ viewMode: viewMode === 'list' ? 'calendar' : 'list' })}
              style={({ pressed }) => [styles.viewToggle, pressed && styles.viewTogglePressed]}
            >
              <Text style={styles.viewToggleText}>
                {viewMode === 'list' ? 'Calendar view' : 'List view'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('ManualAttendanceEntry')}
              style={({ pressed }) => [styles.viewToggle, pressed && styles.viewTogglePressed]}
            >
              <Text style={styles.viewToggleText}>Manual entry</Text>
            </Pressable>
          </View>

          <View style={styles.exportRow}>
            <Button
              label={exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
              variant="secondary"
              onPress={() => void handleExportCsv()}
              disabled={Boolean(exporting) || records.length === 0}
            />
            <Button
              label={exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
              variant="secondary"
              onPress={() => void handleExportPdf()}
              disabled={Boolean(exporting) || records.length === 0}
            />
          </View>
        </View>

        <AttendanceSummaryStrip
          present={counts.present}
          absent={counts.absent}
          late={counts.late}
        />

        {viewMode === 'calendar' ? (
          <View style={styles.calendarCard}>
            <AttendanceCalendar
              year={selected.getFullYear()}
              month={selected.getMonth() + 1}
              selectedDate={selectedDate}
              records={records.map((r) => ({ date: r.date, status: r.status }))}
              onDayPress={handleCalendarDayPress}
            />
          </View>
        ) : (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Records</Text>
            <Text style={styles.sectionCount}>{records.length} officer(s)</Text>
          </View>
        )}
      </View>
    );
  }, [
    counts.absent,
    counts.late,
    counts.present,
    dateFrom,
    dateTo,
    exporting,
    handleCalendarDayPress,
    handleExportCsv,
    handleExportPdf,
    navigation,
    records,
    selectedDate,
    updatePrefs,
    useDateRange,
    viewMode,
  ]);

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
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No attendance records</Text>
                <Text style={styles.emptySubtitle}>
                  No officer sessions were logged for {formatDisplayDate(selectedDate)}.
                </Text>
              </View>
            }
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
  rangeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rangeToggleLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  toolbarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  exportRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  viewToggle: { paddingVertical: spacing.xs },
  viewTogglePressed: { opacity: 0.7 },
  viewToggleText: { fontSize: 14, fontWeight: '600', color: adminColors.primary },
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
  kpiLabel: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
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
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  sectionCount: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
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
  chipInfo: { backgroundColor: adminColors.primaryTint, borderColor: '#C9C2F0' },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextWarning: { color: '#B45309' },
  chipTextError: { color: '#B91C1C' },
  chipTextInfo: { color: adminColors.primary },
  manualNote: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' },
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
  recordMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  recordMeta: { flexShrink: 1, fontSize: 13, color: colors.textSecondary },
  recordMetaDot: { fontSize: 13, color: colors.textSecondary },
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
