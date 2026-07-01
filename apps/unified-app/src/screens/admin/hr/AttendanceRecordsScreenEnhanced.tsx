import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar';
import { AdminButton, AdminScreenLayout, AdminStateShell, DateField, FilterChips, RoleGuard, SearchBar, SelectField, StatusBadge } from '@/components/admin';
import { useAdminAttendance } from '@/hooks/attendance/useAdminAttendance';
import { setAdminRecordsPrefs } from '@/store/slices/attendanceSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { AttendanceRecord, AttendanceStatus, CheckInMethod } from '@/types/attendance';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { shareAttendanceCsv, shareAttendancePdf, resolveExportCalendarMonths, downloadAttendanceCsvInBrowser } from '@/utils/attendanceExport';
import { isWebBrowser } from '@/utils/webFileDownload';
import { formatAttendanceDuration } from '@/utils/attendanceDuration';
import {
  filterAndSortAttendanceRecords,
  type AttendanceRecordsSortKey,
  type AttendanceStatusFilter,
} from '@/utils/attendanceRecordsFilters';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'AttendanceRecords'>;

const PAGE_PADDING = spacing.lg;
const CARD_RADIUS = 22;

const STATUS_FILTER_OPTIONS: { value: AttendanceStatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'half_day', label: 'Half day' },
  { value: 'on_leave', label: 'On leave' },
  { value: 'holiday', label: 'Holiday' },
];

const SORT_OPTIONS: { value: AttendanceRecordsSortKey; label: string }[] = [
  { value: 'date_desc', label: 'Date (newest)' },
  { value: 'date_asc', label: 'Date (oldest)' },
  { value: 'name_asc', label: 'Officer A–Z' },
  { value: 'name_desc', label: 'Officer Z–A' },
  { value: 'checkin_desc', label: 'Check-in (latest)' },
  { value: 'checkin_asc', label: 'Check-in (earliest)' },
  { value: 'status', label: 'Status priority' },
];

function formatTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(record: AttendanceRecord): string {
  return formatAttendanceDuration(record);
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
          <Text style={styles.recordTimeValue}>{formatDuration(item)}</Text>
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

export function AttendanceRecordsScreenEnhanced({ route, navigation }: Props) {
  const dispatch = useAppDispatch();
  const prefs = useAppSelector((s) => s.attendance.adminRecordsPrefs);
  const { viewMode, selectedDate, dateFrom, dateTo, useDateRange } = prefs;

  const [searchQuery, setSearchQuery] = useState(route.params?.officerName ?? '');

  useEffect(() => {
    const params = route.params;
    if (!params?.dateFrom && !params?.dateTo && !params?.officerName) return;
    dispatch(
      setAdminRecordsPrefs({
        useDateRange: Boolean(params.dateFrom && params.dateTo),
        ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
        ...(params.dateTo ? { dateTo: params.dateTo } : {}),
      }),
    );
    if (params.officerName) {
      setSearchQuery(params.officerName);
    }
  }, [dispatch, route.params]);

  const queryArgs = useMemo(
    () =>
      useDateRange
        ? { from: dateFrom, to: dateTo }
        : { date: selectedDate },
    [dateFrom, dateTo, selectedDate, useDateRange],
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useAdminAttendance(queryArgs);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const [includeCalendarInPdf, setIncludeCalendarInPdf] = useState(viewMode === 'calendar');
  const [exportError, setExportError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AttendanceStatusFilter>('all');
  const [sortBy, setSortBy] = useState<AttendanceRecordsSortKey>('date_desc');

  const records = data ?? [];
  const filteredRecords = useMemo(
    () => filterAndSortAttendanceRecords(records, searchQuery, statusFilter, sortBy),
    [records, searchQuery, sortBy, statusFilter],
  );
  const counts = useMemo(
    () => ({
      present: filteredRecords.filter((r) => r.status === 'present').length,
      absent: filteredRecords.filter((r) => r.status === 'absent' || !r.checkInTime).length,
      late: filteredRecords.filter((r) => r.status === 'late' || r.isLate).length,
    }),
    [filteredRecords],
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

  const handleExportCsv = useCallback(() => {
    setExportError(null);
    if (filteredRecords.length === 0) return;

    if (isWebBrowser()) {
      try {
        downloadAttendanceCsvInBrowser(filteredRecords, rangeLabel.replace(/\s/g, '_'));
      } catch (e) {
        setExportError(queryErrorMessage(e));
      }
      return;
    }

    setExporting('csv');
    void shareAttendanceCsv(filteredRecords, rangeLabel.replace(/\s/g, '_'))
      .catch((e) => setExportError(queryErrorMessage(e)))
      .finally(() => setExporting(null));
  }, [filteredRecords, rangeLabel]);

  const handleExportPdf = useCallback(() => {
    setExportError(null);
    if (filteredRecords.length === 0) return;

    setExporting('pdf');
    void shareAttendancePdf(filteredRecords, rangeLabel, {
      includeCalendar: includeCalendarInPdf,
      calendarMonths: includeCalendarInPdf
        ? resolveExportCalendarMonths(filteredRecords, useDateRange, dateFrom, dateTo, selectedDate)
        : undefined,
    })
      .catch((e) => setExportError(queryErrorMessage(e)))
      .finally(() => setExporting(null));
  }, [
    dateFrom,
    dateTo,
    filteredRecords,
    includeCalendarInPdf,
    rangeLabel,
    selectedDate,
    useDateRange,
  ]);

  const renderItem = useCallback(
    ({ item }: { item: AttendanceRecord }) => <AttendanceHistoryCard item={item} />,
    [],
  );

  const listHeader = useMemo(() => {
    const calendarAnchor = useDateRange ? dateFrom : selectedDate;
    const selected = new Date(calendarAnchor);

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
            <AdminButton
              label={exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
              variant="secondary"
              onPress={handleExportCsv}
              disabled={Boolean(exporting) || filteredRecords.length === 0}
            />
            <AdminButton
              label={exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
              variant="secondary"
              onPress={handleExportPdf}
              disabled={Boolean(exporting) || filteredRecords.length === 0}
            />
          </View>

          <View style={styles.calendarExportRow}>
            <Text style={styles.calendarExportLabel}>Include calendar in PDF</Text>
            <Switch
              value={includeCalendarInPdf}
              onValueChange={setIncludeCalendarInPdf}
              trackColor={{ true: adminColors.primary }}
            />
          </View>

          {exportError ? <Text style={styles.exportError}>{exportError}</Text> : null}
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
          <>
            <View style={styles.listControls}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search officer, zone, notes…"
                containerStyle={styles.searchBar}
              />
              <SelectField
                label="Sort by"
                value={sortBy}
                options={SORT_OPTIONS}
                onSelect={setSortBy}
                placeholder="Sort records"
              />
              <FilterChips
                options={STATUS_FILTER_OPTIONS}
                selected={statusFilter}
                onSelect={setStatusFilter}
              />
            </View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Records</Text>
              <Text style={styles.sectionCount}>
                {filteredRecords.length === records.length
                  ? `${records.length} officer(s)`
                  : `${filteredRecords.length} of ${records.length}`}
              </Text>
            </View>
          </>
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
    exportError,
    handleCalendarDayPress,
    handleExportCsv,
    handleExportPdf,
    includeCalendarInPdf,
    navigation,
    records,
    selectedDate,
    filteredRecords.length,
    records.length,
    searchQuery,
    sortBy,
    statusFilter,
    updatePrefs,
    useDateRange,
    viewMode,
  ]);

  return (
    <RoleGuard requiredPermission="attendance.view">
      <AdminStateShell
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        loadingRows={8}
        loadingShape="card"
      >
      <AdminScreenLayout>
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
            data={filteredRecords}
            keyExtractor={(r) => r.id}
            renderItem={renderItem}
            ListHeaderComponent={listHeader}
            contentContainerStyle={adminScreenStyles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={isFetching}
            onRefresh={refetch}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>
                  {records.length === 0 ? 'No attendance records' : 'No matching records'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {records.length === 0
                    ? `No officer sessions were logged for ${formatDisplayDate(selectedDate)}.`
                    : 'Try adjusting your search or status filter.'}
                </Text>
              </View>
            }
          />
        )}
      </AdminScreenLayout>
      </AdminStateShell>
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
  calendarExportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xxs,
  },
  calendarExportLabel: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  exportError: { fontSize: 13, color: colors.errorRed, marginTop: spacing.xxs },
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
  kpiCellPresent: { backgroundColor: adminColors.attendanceKpiCell.present },
  kpiCellAbsent: { backgroundColor: adminColors.attendanceKpiCell.absent },
  kpiCellLate: { backgroundColor: adminColors.attendanceKpiCell.late },
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
  listControls: { gap: spacing.sm },
  searchBar: { marginBottom: 0 },
  recordCard: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  recordHeader: { gap: 4 },
  recordName: {
    fontSize: 15,
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
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  chipWarning: { backgroundColor: adminColors.chipTones.warning.bg, borderColor: adminColors.chipTones.warning.border },
  chipError: { backgroundColor: adminColors.chipTones.error.bg, borderColor: adminColors.chipTones.error.border },
  chipInfo: { backgroundColor: adminColors.chipTones.primary.bg, borderColor: adminColors.chipTones.primary.border },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextWarning: { color: adminColors.chipTones.warning.text },
  chipTextError: { color: adminColors.chipTones.error.text },
  chipTextInfo: { color: adminColors.primary },
  manualNote: { fontSize: 11, color: colors.textSecondary, fontStyle: 'italic' },
  recordTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: adminColors.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  recordTimeCell: { flex: 1, alignItems: 'center', gap: 1 },
  recordTimeDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: colors.borderDefault,
  },
  recordTimeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  recordTimeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  recordMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  recordMeta: { flexShrink: 1, fontSize: 11, color: colors.textSecondary },
  recordMetaDot: { fontSize: 11, color: colors.textSecondary },
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
