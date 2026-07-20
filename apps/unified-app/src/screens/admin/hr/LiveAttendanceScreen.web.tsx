import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import { AdminScreenLayout, RoleGuard, StatusBadge, useAdminPermission, AvatarIcon } from '@/components/admin';
import { AdminShiftEditModal } from '@/components/admin/attendance/AdminShiftEditModal';
import { DismissKeyboardScrollView } from '@/components/common/DismissKeyboardScrollView';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { LiveOfficerMap } from '@/components/map/LiveOfficerMap.web';
import {
  useAllAttendanceToday,
  useGeofences,
  useLiveOfficerLocations,
} from '@/hooks/attendance/useAdminAttendance';
import type { AttendanceRecord, CheckInMethod } from '@/types/attendance';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { pageLayout } from '@/theme/pageLayout';
import { radius, spacing } from '@/theme/spacing';
import { formatSyncLabel } from '@/utils/dateUtils';
import { queryErrorMessage } from '@/utils/queryError';

/** Below this height the collapsed map is crushed under the summary + toolbar. */
const SHORT_VIEWPORT_H = 700;

const TOOLBAR_BASE = 72;

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'LiveAttendance'>;

const CARD_RADIUS = radius.xl;

type ChipTone = keyof typeof adminColors.chipTones;

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

function OperationalChip({ label, tone }: { label: string; tone: ChipTone }) {
  const palette = adminColors.chipTones[tone];
  return (
    <View style={[styles.chip, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.chipText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

function LivePulse() {
  return (
    <View style={styles.livePulseWrap}>
      <View style={styles.livePulseDot} />
      <Text style={styles.livePulseText}>Live</Text>
    </View>
  );
}

function LiveOperationsSummary({
  checkedIn,
  inGeofence,
  exceptions,
  activeGeofences,
  lastSync,
  refreshing,
  onRefresh,
}: {
  checkedIn: number;
  inGeofence: number;
  exceptions: number;
  activeGeofences: number;
  lastSync?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const sync = formatSyncLabel(lastSync);

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <View style={styles.summaryTitleRow}>
          <Text style={styles.summaryTitle}>Today&apos;s Attendance</Text>
          <LivePulse />
        </View>
        <View style={styles.syncColumn}>
          <Text style={[styles.summarySync, sync.isStale && styles.summarySyncStale]}>
            {sync.label}
          </Text>
          {sync.isStale ? <Text style={styles.staleHint}>Data may be stale</Text> : null}
          {onRefresh ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh live attendance"
              hitSlop={8}
              disabled={refreshing}
              style={({ pressed }) => [
                styles.refreshBtn,
                pressed && styles.refreshBtnPressed,
                refreshing && styles.refreshBtnDisabled,
              ]}
              onPress={onRefresh}
            >
              <Ionicons
                name="refresh"
                size={16}
                color={adminColors.primary}
              />
              <Text style={styles.refreshBtnText}>{refreshing ? 'Refreshing…' : 'Refresh'}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text style={styles.summaryHelper}>
        Real-time attendance with location validation
      </Text>

      <View style={styles.summaryMetrics}>
        <View style={styles.summaryMetric}>
          <Text style={styles.summaryMetricValue}>{checkedIn}</Text>
          <Text style={styles.summaryMetricLabel}>Checked in</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryMetric}>
          <Text style={[styles.summaryMetricValue, styles.summaryMetricAccent]}>{inGeofence}</Text>
          <Text style={styles.summaryMetricLabel}>In geofence</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryMetric}>
          <Text
            style={[
              styles.summaryMetricValue,
              exceptions > 0 ? styles.summaryMetricWarning : undefined,
            ]}
          >
            {exceptions}
          </Text>
          <Text style={styles.summaryMetricLabel}>Need review</Text>
        </View>
      </View>

      <View style={styles.summaryFooter}>
        <OperationalChip
          label={
            activeGeofences > 0
              ? `${activeGeofences} active zone${activeGeofences === 1 ? '' : 's'}`
              : 'No active zones'
          }
          tone={activeGeofences > 0 ? 'primary' : 'neutral'}
        />
      </View>
    </View>
  );
}

function AttendanceKpiStrip({
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
        <Text style={styles.kpiCaption}>Today</Text>
      </View>
      <View style={styles.kpiDivider} />
      <View style={[styles.kpiCell, styles.kpiCellAbsent]}>
        <Text style={[styles.kpiValue, styles.kpiValueAbsent]}>{absent}</Text>
        <Text style={styles.kpiLabel}>Absent</Text>
        <Text style={styles.kpiCaption}>Today</Text>
      </View>
      <View style={styles.kpiDivider} />
      <View style={[styles.kpiCell, styles.kpiCellLate]}>
        <Text style={[styles.kpiValue, styles.kpiValueLate]}>{late}</Text>
        <Text style={styles.kpiLabel}>Late</Text>
        <Text style={styles.kpiCaption}>Today</Text>
      </View>
    </View>
  );
}

function AttendanceRecordCard({
  item,
  canEdit,
  onEdit,
  onSelect,
  selected,
}: {
  item: AttendanceRecord;
  canEdit: boolean;
  onEdit: (record: AttendanceRecord) => void;
  onSelect: (officerId: string) => void;
  selected: boolean;
}) {
  const isCompleted = Boolean(item.checkOutTime);
  const isOutsideZone = item.checkInMethod === 'approved_outside';
  const needsApproval = Boolean(item.approvalRequestId);

  return (
    <Pressable
      style={[styles.recordCard, selected && styles.recordCardSelected]}
      onPress={() => onSelect(item.officerId)}
    >
      <View style={styles.recordHeader}>
        <AvatarIcon name={item.officerName || 'Officer'} uri={item.officerAvatar} size={40} />
        <View style={styles.recordHeaderText}>
          <Text style={styles.recordName}>{item.officerName || 'Unknown officer'}</Text>
          <View style={styles.recordChipRow}>
            <StatusBadge status={item.status} />
            {item.isLate ? <OperationalChip label="Late" tone="warning" /> : null}
            {isCompleted ? <OperationalChip label="Completed" tone="success" /> : null}
            {needsApproval ? <OperationalChip label="Pending approval" tone="warning" /> : null}
            {isOutsideZone ? <OperationalChip label="Outside geofence" tone="error" /> : null}
          </View>
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

      {canEdit ? (
        <Pressable
          style={styles.editBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            onEdit(item);
          }}
        >
          <Text style={styles.editBtnText}>Edit shift</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function RecordsEmptyState({ onAddGeofence }: { onAddGeofence: () => void }) {
  return (
    <View style={styles.recordsEmpty}>
      <Text style={styles.recordsEmptyTitle}>No attendance records yet</Text>
      <Text style={styles.recordsEmptySubtitle}>
        Officer check-ins will appear here in real time as they are validated against active
        geofences.
      </Text>
      <Pressable style={styles.recordsEmptyCta} onPress={onAddGeofence}>
        <Text style={styles.recordsEmptyCtaText}>No active zones — Add a geofence</Text>
      </Pressable>
    </View>
  );
}

/** Web: Leaflet map + list-based live attendance (react-native-maps is native-only). */
export function LiveAttendanceScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowH, width: windowW } = useWindowDimensions();
  const shortViewport = windowH < SHORT_VIEWPORT_H;
  // Screen already applies insets.bottom; toolbar needs its own content pad (was missing on web).
  const toolbarPadBottom = spacing.md;
  const toolbarInset = TOOLBAR_BASE + toolbarPadBottom;
  const canEditShifts = useAdminPermission('attendance.edit');
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [focusOfficerId, setFocusOfficerId] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(shortViewport);
  const [userToggledMap, setUserToggledMap] = useState(false);

  // Keep map usable on short mobile viewports unless the user explicitly minimized.
  useEffect(() => {
    if (userToggledMap) return;
    setMapExpanded(shortViewport);
  }, [shortViewport, userToggledMap]);
  const {
    data: locations,
    isLoading: locationsLoading,
    isError: locationsError,
    error: locationsQueryError,
    refetch: refetchLocations,
  } = useLiveOfficerLocations();
  const {
    data: attendance,
    isLoading: attendanceLoading,
    isError: attendanceError,
    error: attendanceQueryError,
    refetch: refetchAttendance,
  } = useAllAttendanceToday();
  const { data: geofences, refetch: refetchGeofences } = useGeofences();

  const [userRefreshing, setUserRefreshing] = useState(false);
  const [lastFetchAt, setLastFetchAt] = useState<string | undefined>();

  const isLoading = attendanceLoading || locationsLoading;
  const isError = attendanceError || locationsError;
  const error = attendanceQueryError ?? locationsQueryError;

  useEffect(() => {
    if (!isLoading) {
      setLastFetchAt(new Date().toISOString());
    }
  }, [attendance, isLoading, locations]);

  const counts = useMemo(() => {
    const records = attendance ?? [];
    return {
      present: records.filter((r) => r.status === 'present').length,
      absent: records.filter((r) => !r.checkInTime).length,
      late: records.filter((r) => r.isLate).length,
    };
  }, [attendance]);

  const opsSummary = useMemo(() => {
    const locs = locations ?? [];
    const records = attendance ?? [];
    const activeGeofenceList = (geofences ?? []).filter((g) => g.isActive);
    const inGeofence = locs.filter((l) => l.isInsideGeofence).length;
    const checkedIn = records.filter((r) => r.checkInTime).length;
    const exceptions = records.filter((r) => r.approvalRequestId || r.isLate).length;
    const lastSync = [lastFetchAt, ...locs.map((l) => l.lastUpdated)]
      .filter(Boolean)
      .reduce<string | undefined>((latest, ts) => {
        if (!latest || new Date(ts!) > new Date(latest)) return ts;
        return latest;
      }, undefined);

    const siteLabel =
      activeGeofenceList.length > 0
        ? activeGeofenceList
            .slice(0, 2)
            .map((g) => g.name)
            .join(' · ')
        : geofences?.[0]?.city
          ? `${geofences[0].city}${geofences[0].state ? `, ${geofences[0].state}` : ''}`
          : 'Monitoring all zones';

    return {
      checkedIn,
      inGeofence,
      exceptions,
      activeGeofences: activeGeofenceList.length,
      lastSync,
      siteLabel,
      geofenceActive: activeGeofenceList.length > 0,
    };
  }, [attendance, geofences, lastFetchAt, locations]);

  const handleRefresh = useCallback(() => {
    setUserRefreshing(true);
    void Promise.all([
      refetchAttendance(),
      refetchLocations(),
      refetchGeofences(),
    ]).finally(() => {
      setLastFetchAt(new Date().toISOString());
      setUserRefreshing(false);
    });
  }, [refetchAttendance, refetchGeofences, refetchLocations]);

  const handleOfficerFocus = useCallback((officerId: string) => {
    setFocusOfficerId(officerId);
  }, []);

  const handleOfficerCardSelect = useCallback((officerId: string) => {
    setFocusOfficerId(officerId);
    setUserToggledMap(true);
    setMapExpanded(true);
  }, []);

  const handleToggleMapExpanded = useCallback(() => {
    setUserToggledMap(true);
    setMapExpanded((prev) => !prev);
  }, []);

  if (isLoading) {
    return (
      <AdminScreenLayout>
        <SkeletonLoader rows={8} />
      </AdminScreenLayout>
    );
  }

  if (isError) {
    return (
      <AdminScreenLayout>
        <ErrorState message={queryErrorMessage(error)} onRetry={handleRefresh} />
      </AdminScreenLayout>
    );
  }

  const attendanceRows = attendance ?? [];
  const liveLocations = locations ?? [];

  const mapProps = {
    locations: liveLocations,
    geofences: geofences ?? [],
    siteLabel: opsSummary.siteLabel,
    lastSync: opsSummary.lastSync,
    inGeofenceCount: opsSummary.inGeofence,
    geofenceActive: opsSummary.geofenceActive,
    focusOfficerId,
    onOfficerFocus: handleOfficerFocus,
    onToggleExpanded: handleToggleMapExpanded,
  };

  return (
    <RoleGuard requiredPermission="attendance.view">
      <AdminScreenLayout padded={false}>
        <View style={styles.pageWrap}>
          {mapExpanded ? (
            <View style={styles.expandedMapShell}>
              <View style={styles.expandedMapToolbar}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Refresh live attendance"
                  hitSlop={8}
                  disabled={userRefreshing}
                  style={({ pressed }) => [
                    styles.refreshBtn,
                    pressed && styles.refreshBtnPressed,
                    userRefreshing && styles.refreshBtnDisabled,
                  ]}
                  onPress={handleRefresh}
                >
                  <Ionicons name="refresh" size={16} color={adminColors.primary} />
                  <Text style={styles.refreshBtnText}>
                    {userRefreshing ? 'Refreshing…' : 'Refresh'}
                  </Text>
                </Pressable>
              </View>
              <LiveOfficerMap {...mapProps} expanded />
            </View>
          ) : (
            <DismissKeyboardScrollView
              style={styles.flex}
              contentContainerStyle={[
                adminScreenStyles.listContent,
                styles.scrollContent,
                { paddingBottom: toolbarInset },
              ]}
              // RefreshControl is a no-op on react-native-web — Refresh button below is the web path.
              refreshControl={
                Platform.OS !== 'web' ? (
                  <RefreshControl refreshing={userRefreshing} onRefresh={handleRefresh} />
                ) : undefined
              }
            >
              <LiveOperationsSummary
                checkedIn={opsSummary.checkedIn}
                inGeofence={opsSummary.inGeofence}
                exceptions={opsSummary.exceptions}
                activeGeofences={opsSummary.activeGeofences}
                lastSync={opsSummary.lastSync}
                refreshing={userRefreshing}
                onRefresh={handleRefresh}
              />

              <LiveOfficerMap {...mapProps} expanded={false} />

              <AttendanceKpiStrip
                present={counts.present}
                absent={counts.absent}
                late={counts.late}
              />

              <View style={styles.recordsSectionHeader}>
                <Text style={styles.recordsSectionTitle}>Live records</Text>
                <Text style={styles.recordsSectionCount}>
                  {attendanceRows.length} officer{attendanceRows.length === 1 ? '' : 's'}
                </Text>
              </View>

              {attendanceRows.length === 0 ? (
                <RecordsEmptyState
                  onAddGeofence={() => navigation.navigate('CreateGeofence', {})}
                />
              ) : (
                <View style={styles.recordsList}>
                  {attendanceRows.map((item) => (
                    <AttendanceRecordCard
                      key={item.id}
                      item={item}
                      canEdit={canEditShifts}
                      onEdit={setEditingRecord}
                      onSelect={handleOfficerCardSelect}
                      selected={item.officerId === focusOfficerId}
                    />
                  ))}
                </View>
              )}
            </DismissKeyboardScrollView>
          )}

          <View style={[styles.toolbar, { paddingBottom: toolbarPadBottom }]}>
            <Pressable
              style={({ pressed }) => [styles.toolbarBtn, pressed && styles.toolbarBtnPressed]}
              onPress={() => navigation.navigate('GeofenceManagement')}
            >
              <Text style={styles.toolbarBtnText}>Geofences</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.toolbarBtn, pressed && styles.toolbarBtnPressed]}
              onPress={() => navigation.navigate('ApprovalRequests')}
            >
              <Text style={styles.toolbarBtnText}>Approvals</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.toolbarBtn, pressed && styles.toolbarBtnPressed]}
              onPress={() => navigation.navigate('AttendanceRecords')}
            >
              <Text style={styles.toolbarBtnText}>Records</Text>
            </Pressable>
          </View>
        </View>

        <AdminShiftEditModal
          visible={editingRecord != null}
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSaved={() => void refetchAttendance()}
        />
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  pageWrap: { flex: 1 },
  flex: { flex: 1 },
  expandedMapShell: {
    flex: 1,
    minHeight: 0,
  },
  expandedMapToolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: adminColors.cardBg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderDefault,
    zIndex: 1200,
  },
  scrollContent: {
    flexGrow: 1,
    gap: spacing.md,
  },
  summaryCard: {
    backgroundColor: adminColors.cardBg,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    flexWrap: 'wrap',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  syncColumn: {
    alignItems: 'flex-end',
    gap: 2,
  },
  summarySync: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'right',
  },
  summarySyncStale: {
    color: adminColors.badgePending,
  },
  staleHint: {
    fontSize: 10,
    fontWeight: '600',
    color: adminColors.badgePending,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: adminColors.primary,
    backgroundColor: colors.surfaceWhite,
    minHeight: 32,
  },
  refreshBtnPressed: {
    backgroundColor: adminColors.primaryTint,
  },
  refreshBtnDisabled: {
    opacity: 0.6,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: adminColors.primary,
  },
  summaryHelper: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  summaryMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: adminColors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    paddingVertical: spacing.sm,
  },
  summaryMetric: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryMetricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  summaryMetricAccent: {
    color: adminColors.sectionIconTeal,
  },
  summaryMetricWarning: {
    color: adminColors.badgePending,
  },
  summaryMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.borderDefault,
  },
  summaryFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  livePulseWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: adminColors.chipTones.success.bg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: adminColors.chipTones.success.border,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: adminColors.badgeActive,
  },
  livePulseText: {
    fontSize: 11,
    fontWeight: '700',
    color: adminColors.chipTones.success.text,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
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
  },
  kpiValuePresent: { color: adminColors.badgeActive },
  kpiValueAbsent: { color: adminColors.badgeBlocked },
  kpiValueLate: { color: adminColors.badgePending },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  kpiCaption: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  recordsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: spacing.xxs,
  },
  recordsSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recordsSectionCount: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  recordsList: {
    gap: spacing.sm,
  },
  recordCard: {
    backgroundColor: adminColors.cardBg,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    gap: spacing.sm,
  },
  recordCardSelected: {
    borderColor: adminColors.primary,
    borderWidth: 1.5,
    backgroundColor: adminColors.primaryTint,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  recordHeaderText: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
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
  recordTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: adminColors.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  recordTimeCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
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
  recordMetaDot: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  recordLateNote: {
    fontSize: 12,
    fontWeight: '600',
    color: adminColors.badgePending,
  },
  editBtn: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: adminColors.primary,
  },
  recordsEmpty: {
    backgroundColor: adminColors.cardBg,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  recordsEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  recordsEmptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  recordsEmptyCta: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: adminColors.primaryTint,
    borderWidth: 1,
    borderColor: adminColors.primary,
  },
  recordsEmptyCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: adminColors.primary,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: pageLayout.pagePadding,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderDefault,
    backgroundColor: adminColors.cardBg,
  },
  toolbarBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: adminColors.dashboard.ctaBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: adminColors.dashboard.ctaBorder,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  toolbarBtnPressed: {
    backgroundColor: adminColors.dashboard.ctaPressedBg,
  },
  toolbarBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: adminColors.primary,
    letterSpacing: 0.15,
  },
});
