import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar';
import { AttendanceDayDetailSheet } from '@/components/attendance/AttendanceDayDetailSheet';
import { EmployeeSelector } from '@/components/attendance/EmployeeSelector';
import { AdminButton, AdminScreenLayout, AdminStateShell, DateField, FilterChips, RoleGuard, SearchBar, SelectField, StatusBadge } from '@/components/admin';
import { useAdminAttendance, useAttendanceStatusByDay } from '@/hooks/attendance/useAdminAttendance';
import { useGetOfficersQuery } from '@/services/api/officersApi';
import { setAdminRecordsPrefs } from '@/store/slices/attendanceSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { AttendanceRecord, AttendanceStatus, CheckInMethod } from '@/types/attendance';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { shareAttendanceCsv, shareAttendancePdf, resolveExportCalendarMonths, downloadAttendanceCsvInBrowser } from '@/utils/attendanceExport';
import { formatMonthYearLabel, getMonthIsoRange, listMonthsBetween } from '@/utils/attendanceCalendarGrid';
import { countAttendanceStatuses, filterRowsForMonth } from '@/utils/attendanceStatus';
import { isWebBrowser } from '@/utils/webFileDownload';
import { formatAttendanceDuration } from '@/utils/attendanceDuration';
import {
  filterAndSortAttendanceRecords,
  type AttendanceRecordsSortKey,
  type AttendanceStatusFilter,
} from '@/utils/attendanceRecordsFilters';
import { parseLocalDateString } from '@/utils/dateUtils';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'AttendanceRecords'>;

const PAGE_PADDING = spacing.lg;
const CARD_RADIUS = 22;

type ViewTab = 'calendar' | 'list' | 'manual';

const STATUS_FILTER_OPTIONS: { value: AttendanceStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
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
  return parseLocalDateString(iso).toLocaleDateString([], {
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
  counts,
  subtitle,
}: {
  counts: {
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    onLeave: number;
    holiday: number;
  };
  subtitle: string;
}) {
  const tiles = [
    { key: 'present', label: 'Present', value: counts.present, cellStyle: styles.kpiCellPresent, valueStyle: styles.kpiValuePresent },
    { key: 'absent', label: 'Absent', value: counts.absent, cellStyle: styles.kpiCellAbsent, valueStyle: styles.kpiValueAbsent },
    { key: 'late', label: 'Late', value: counts.late, cellStyle: styles.kpiCellLate, valueStyle: styles.kpiValueLate },
    { key: 'halfDay', label: 'Half day', value: counts.halfDay, cellStyle: styles.kpiCellHalfDay, valueStyle: styles.kpiValueHalfDay },
    { key: 'onLeave', label: 'On leave', value: counts.onLeave, cellStyle: styles.kpiCellOnLeave, valueStyle: styles.kpiValueOnLeave },
    { key: 'holiday', label: 'Holiday', value: counts.holiday, cellStyle: styles.kpiCellHoliday, valueStyle: styles.kpiValueHoliday },
  ] as const;

  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiSubtitle}>{subtitle}</Text>
      <View style={styles.kpiStrip}>
        {tiles.map((tile, index) => (
          <View key={tile.key} style={styles.kpiTileWrap}>
            {index > 0 ? <View style={styles.kpiDivider} /> : null}
            <View style={[styles.kpiCell, tile.cellStyle]}>
              <Text style={[styles.kpiValue, tile.valueStyle]}>{tile.value}</Text>
              <Text style={styles.kpiLabel}>{tile.label}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function ViewTabs({
  activeTab,
  onSelectCalendar,
  onSelectList,
  onSelectManual,
}: {
  activeTab: ViewTab;
  onSelectCalendar: () => void;
  onSelectList: () => void;
  onSelectManual: () => void;
}) {
  return (
    <View style={styles.viewTabsRow}>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'calendar' }}
        onPress={onSelectCalendar}
        style={[styles.viewTab, activeTab === 'calendar' && styles.viewTabActive]}
      >
        <Text style={[styles.viewTabText, activeTab === 'calendar' && styles.viewTabTextActive]}>
          Calendar view
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'list' }}
        onPress={onSelectList}
        style={[styles.viewTab, activeTab === 'list' && styles.viewTabActive]}
      >
        <Text style={[styles.viewTabText, activeTab === 'list' && styles.viewTabTextActive]}>
          List view
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'manual' }}
        onPress={onSelectManual}
        style={[styles.viewTab, activeTab === 'manual' && styles.viewTabActive]}
      >
        <Text style={[styles.viewTabText, activeTab === 'manual' && styles.viewTabTextActive]}>
          Manual entry
        </Text>
      </Pressable>
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

      <Text style={styles.recordDate}>{formatDisplayDate(item.date)}</Text>

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

  const [selectedOfficerId, setSelectedOfficerId] = useState<string | null>(route.params?.officerId ?? null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dayDetailDate, setDayDetailDate] = useState<string | null>(null);

  const { data: officers = [] } = useGetOfficersQuery();

  useEffect(() => {
    const params = route.params;
    if (!params?.dateFrom && !params?.dateTo && !params?.officerId && !params?.officerName) return;

    dispatch(
      setAdminRecordsPrefs({
        useDateRange: Boolean(params.dateFrom && params.dateTo),
        ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
        ...(params.dateTo ? { dateTo: params.dateTo } : {}),
      }),
    );

    if (params.officerId !== undefined) {
      setSelectedOfficerId(params.officerId ?? null);
    } else if (params.officerName) {
      const match = officers.find(
        (officer) => officer.name.toLowerCase() === params.officerName!.toLowerCase(),
      );
      if (match) setSelectedOfficerId(match.id);
    }
  }, [dispatch, officers, route.params]);

  const calendarAnchor = useDateRange ? dateFrom : selectedDate;
  const calendarAnchorDate = parseLocalDateString(calendarAnchor);
  const calendarYear = calendarAnchorDate.getFullYear();
  const calendarMonth = calendarAnchorDate.getMonth() + 1;

  const queryArgs = useMemo(() => {
    const base: { from?: string; to?: string; date?: string; officerId?: string } = {};

    if (viewMode === 'calendar' && !useDateRange) {
      const monthRange = getMonthIsoRange(calendarYear, calendarMonth);
      base.from = monthRange.from;
      base.to = monthRange.to;
    } else if (useDateRange) {
      base.from = dateFrom;
      base.to = dateTo;
    } else {
      base.date = selectedDate;
    }

    if (selectedOfficerId) {
      base.officerId = selectedOfficerId;
    }

    return base;
  }, [
    calendarMonth,
    calendarYear,
    dateFrom,
    dateTo,
    selectedDate,
    selectedOfficerId,
    useDateRange,
    viewMode,
  ]);

  const statusQueryArgs = useMemo((): { from: string; to: string; officerId?: string } => {
    if (viewMode === 'calendar' && !useDateRange) {
      const monthRange = getMonthIsoRange(calendarYear, calendarMonth);
      return {
        from: monthRange.from,
        to: monthRange.to,
        ...(selectedOfficerId ? { officerId: selectedOfficerId } : {}),
      };
    }

    if (useDateRange) {
      return {
        from: dateFrom,
        to: dateTo,
        ...(selectedOfficerId ? { officerId: selectedOfficerId } : {}),
      };
    }

    return {
      from: selectedDate,
      to: selectedDate,
      ...(selectedOfficerId ? { officerId: selectedOfficerId } : {}),
    };
  }, [
    calendarMonth,
    calendarYear,
    dateFrom,
    dateTo,
    selectedDate,
    selectedOfficerId,
    useDateRange,
    viewMode,
  ]);

  const { data, isLoading, isError, error, refetch, isFetching } = useAdminAttendance(queryArgs);
  const {
    data: statusRows = [],
    isLoading: statusLoading,
    isError: statusIsError,
    error: statusError,
    refetch: refetchStatus,
    isFetching: statusFetching,
  } = useAttendanceStatusByDay(statusQueryArgs);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const [includeCalendarInPdf, setIncludeCalendarInPdf] = useState(viewMode === 'calendar');
  const [exportError, setExportError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AttendanceStatusFilter>('all');
  const [sortBy, setSortBy] = useState<AttendanceRecordsSortKey>('date_desc');

  const records = data ?? [];
  const filteredRecords = useMemo(
    () => filterAndSortAttendanceRecords(records, searchQuery, statusFilter, sortBy, selectedOfficerId),
    [records, searchQuery, selectedOfficerId, sortBy, statusFilter],
  );
  const counts = useMemo(() => {
    const monthRows =
      viewMode === 'calendar' && !useDateRange
        ? filterRowsForMonth(statusRows, calendarYear, calendarMonth)
        : statusRows;
    return countAttendanceStatuses(monthRows);
  }, [calendarMonth, calendarYear, statusRows, useDateRange, viewMode]);

  const calendarMonths = useMemo(() => {
    if (viewMode !== 'calendar') return [];
    if (useDateRange) return listMonthsBetween(dateFrom, dateTo);
    return [{ year: calendarYear, month: calendarMonth }];
  }, [viewMode, useDateRange, dateFrom, dateTo, calendarYear, calendarMonth]);

  const selectedOfficerName = useMemo(() => {
    if (!selectedOfficerId) return 'All employees';
    return officers.find((officer) => officer.id === selectedOfficerId)?.name ?? 'Selected employee';
  }, [officers, selectedOfficerId]);

  const statsSubtitle = useDateRange
    ? `${selectedOfficerName} · ${dateFrom} – ${dateTo}`
    : `${selectedOfficerName} · ${formatMonthYearLabel(calendarYear, calendarMonth)}`;
  const rangeLabel = useDateRange ? `${dateFrom} to ${dateTo}` : selectedDate;

  const employeeSelectorOfficers = useMemo(
    () =>
      officers.map((officer) => ({
        id: officer.id,
        full_name: officer.name,
      })),
    [officers],
  );

  const activeViewTab: ViewTab = viewMode === 'calendar' ? 'calendar' : 'list';

  const updatePrefs = useCallback(
    (patch: Partial<typeof prefs>) => {
      dispatch(setAdminRecordsPrefs(patch));
    },
    [dispatch],
  );

  const handleOfficerSelect = useCallback(
    (officerId: string | null) => {
      setSelectedOfficerId(officerId);
      const officerName = officerId
        ? officers.find((officer) => officer.id === officerId)?.name
        : undefined;
      navigation.setParams({
        officerId: officerId ?? undefined,
        officerName,
      });
    },
    [navigation, officers],
  );

  const handleCalendarDayPress = useCallback((date: string) => {
    setDayDetailDate(date);
  }, []);

  const handleExportCsv = useCallback(() => {
    setExportError(null);
    if (filteredRecords.length === 0) return;

    if (isWebBrowser()) {
      try {
        downloadAttendanceCsvInBrowser(filteredRecords, rangeLabel.replace(/\s/g, '_'), statusRows);
      } catch (e) {
        setExportError(queryErrorMessage(e));
      }
      return;
    }

    setExporting('csv');
    void shareAttendanceCsv(filteredRecords, rangeLabel.replace(/\s/g, '_'), statusRows)
      .catch((e) => setExportError(queryErrorMessage(e)))
      .finally(() => setExporting(null));
  }, [filteredRecords, rangeLabel, statusRows]);

  const handleExportPdf = useCallback(() => {
    setExportError(null);
    if (filteredRecords.length === 0) return;

    setExporting('pdf');
    void shareAttendancePdf(filteredRecords, rangeLabel, {
      includeCalendar: includeCalendarInPdf,
      calendarMonths: includeCalendarInPdf
        ? resolveExportCalendarMonths(filteredRecords, useDateRange, dateFrom, dateTo, selectedDate)
        : undefined,
      statusRows,
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
    statusRows,
  ]);

  const renderItem = useCallback(
    ({ item }: { item: AttendanceRecord }) => <AttendanceHistoryCard item={item} />,
    [],
  );

  const listHeader = useMemo(() => {
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

          <EmployeeSelector
            officers={employeeSelectorOfficers}
            selectedOfficerId={selectedOfficerId}
            onSelect={handleOfficerSelect}
          />

          <ViewTabs
            activeTab={activeViewTab}
            onSelectCalendar={() => updatePrefs({ viewMode: 'calendar' })}
            onSelectList={() => updatePrefs({ viewMode: 'list' })}
            onSelectManual={() => navigation.navigate('ManualAttendanceEntry')}
          />

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

        <AttendanceSummaryStrip counts={counts} subtitle={statsSubtitle} />

        {viewMode === 'calendar' ? (
          <View style={styles.calendarCard}>
            {calendarMonths.map(({ year, month }) => (
              <View key={`${year}-${month}`} style={styles.calendarMonthBlock}>
                {calendarMonths.length > 1 ? (
                  <Text style={styles.calendarMonthTitle}>{formatMonthYearLabel(year, month)}</Text>
                ) : null}
                <AttendanceCalendar
                  year={year}
                  month={month}
                  statusRows={statusRows}
                  selectedOfficerId={selectedOfficerId}
                  selectedDate={selectedDate}
                  onDayPress={handleCalendarDayPress}
                />
              </View>
            ))}
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
                  ? `${records.length} record(s)`
                  : `${filteredRecords.length} of ${records.length}`}
              </Text>
            </View>
          </>
        )}
      </View>
    );
  }, [
    activeViewTab,
    calendarMonths,
    calendarMonth,
    calendarYear,
    counts,
    dateFrom,
    dateTo,
    employeeSelectorOfficers,
    exporting,
    exportError,
    filteredRecords.length,
    handleCalendarDayPress,
    handleExportCsv,
    handleExportPdf,
    handleOfficerSelect,
    includeCalendarInPdf,
    navigation,
    records,
    selectedDate,
    selectedOfficerId,
    searchQuery,
    sortBy,
    statsSubtitle,
    statusFilter,
    statusRows,
    updatePrefs,
    useDateRange,
    viewMode,
  ]);

  return (
    <RoleGuard requiredPermission="attendance.view">
      <AdminStateShell
        isLoading={isLoading || statusLoading}
        isError={isError || statusIsError}
        error={error ?? statusError}
        onRetry={() => {
          void refetch();
          void refetchStatus();
        }}
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
            refreshing={isFetching || statusFetching}
            onRefresh={() => {
              void refetch();
              void refetchStatus();
            }}
          />
        ) : (
          <FlatList
            data={filteredRecords}
            keyExtractor={(r) => r.id}
            renderItem={renderItem}
            ListHeaderComponent={listHeader}
            contentContainerStyle={adminScreenStyles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={isFetching || statusFetching}
            onRefresh={() => {
              void refetch();
              void refetchStatus();
            }}
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

        <AttendanceDayDetailSheet
          visible={dayDetailDate !== null}
          date={dayDetailDate}
          records={records}
          statusRows={statusRows}
          selectedOfficerId={selectedOfficerId}
          onClose={() => setDayDetailDate(null)}
        />
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
  viewTabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderDefault,
    paddingBottom: spacing.xs,
  },
  viewTab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  viewTabActive: {
    backgroundColor: adminColors.primaryTint,
  },
  viewTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  viewTabTextActive: {
    color: adminColors.primary,
  },
  exportRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  calendarExportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xxs,
  },
  calendarExportLabel: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  exportError: { fontSize: 13, color: colors.errorRed, marginTop: spacing.xxs },
  kpiCard: {
    backgroundColor: adminColors.cardBg,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  kpiSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  kpiStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  kpiTileWrap: {
    flexDirection: 'row',
    width: '33.33%',
    minWidth: '33.33%',
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
  kpiCellHalfDay: { backgroundColor: adminColors.attendanceKpiExtended.halfDay },
  kpiCellOnLeave: { backgroundColor: adminColors.attendanceKpiExtended.onLeave },
  kpiCellHoliday: { backgroundColor: adminColors.attendanceKpiExtended.holiday },
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
  kpiValueHalfDay: { color: adminColors.chipTones.success.text },
  kpiValueOnLeave: { color: adminColors.chipTones.info.text },
  kpiValueHoliday: { color: colors.textSecondary },
  kpiLabel: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
  calendarCard: {
    backgroundColor: adminColors.cardBg,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    padding: spacing.md,
  },
  calendarMonthBlock: {
    marginBottom: spacing.md,
  },
  calendarMonthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
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
    gap: spacing.xxs,
  },
  recordHeader: { gap: 4 },
  recordName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  recordDate: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
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
