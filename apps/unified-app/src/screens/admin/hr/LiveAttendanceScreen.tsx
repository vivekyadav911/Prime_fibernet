import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';


import { AdminScreenLayout, RoleGuard, StatusBadge, useAdminPermission, AvatarIcon } from '@/components/admin';
import { AdminShiftEditModal } from '@/components/admin/attendance/AdminShiftEditModal';
import { LiveOfficerMap } from '@/components/map/LiveOfficerMap';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useAttendanceRealtimeSync } from '@/hooks/attendance/useAttendanceRealtimeSync';
import { useAttendanceStats } from '@/hooks/attendance/useAttendanceStats';
import type { AttendanceRecord, CheckInMethod } from '@/types/attendance';
import type { AdminAttendanceStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { pageLayout } from '@/theme/pageLayout';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';
import { formatSyncLabel } from '@/utils/dateUtils';

type Props = NativeStackScreenProps<AdminAttendanceStackParamList, 'LiveAttendance'>;

const PAGE_PADDING = pageLayout.pagePadding;
const TOOLBAR_INSET = 72;
const CARD_RADIUS = radius.xl;
const MAP_HEIGHT = 228;
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

function formatRelativeSync(iso?: string): string {
  return formatSyncLabel(iso).label;
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

type SummaryProps = {
  checkedIn: number;
  inGeofence: number;
  exceptions: number;
  activeGeofences: number;
  lastSync?: string;
};

function LiveOperationsSummary({
  checkedIn,
  inGeofence,
  exceptions,
  activeGeofences,
  lastSync,
}: SummaryProps) {
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
          <Text style={[styles.summaryMetricValue, styles.summaryMetricAccent]}>
            {inGeofence}
          </Text>
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
          label={activeGeofences > 0 ? `${activeGeofences} active zone${activeGeofences === 1 ? '' : 's'}` : 'No active zones'}
          tone={activeGeofences > 0 ? 'primary' : 'neutral'}
        />
      </View>
    </View>
  );
}

const MAP_EDGE_PADDING = {
  top: 58,
  right: 72,
  bottom: 56,
  left: 12,
};

type KpiStripProps = {
  present: number;
  absent: number;
  late: number;
};

function AttendanceKpiStrip({ present, absent, late }: KpiStripProps) {
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
}: {
  item: AttendanceRecord;
  canEdit: boolean;
  onEdit: (record: AttendanceRecord) => void;
}) {
  const isCompleted = Boolean(item.checkOutTime);
  const isOutsideZone = item.checkInMethod === 'approved_outside';
  const needsApproval = Boolean(item.approvalRequestId);

  return (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <AvatarIcon name={item.officerName} uri={item.officerAvatar} size={40} />
        <View style={styles.recordHeaderText}>
          <Text style={styles.recordName}>{item.officerName}</Text>
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
        <Pressable style={styles.editBtn} onPress={() => onEdit(item)}>
          <Text style={styles.editBtnText}>Edit shift</Text>
        </Pressable>
      ) : null}
    </View>
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

export function LiveAttendanceScreen({ navigation }: Props) {
  useAttendanceRealtimeSync();
  const canEditShifts = useAdminPermission('attendance.edit');
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const {
    stats,
    isLoading,
    isError,
    error,
    refetch: refetchStats,
  } = useAttendanceStats();
  const attendance = stats.records;
  const locations = stats.locations;
  const geofences = stats.geofences;
  const locationsLoading = isLoading;
  const [userRefreshing, setUserRefreshing] = useState(false);
  const [lastFetchAt, setLastFetchAt] = useState<string | undefined>();

  useEffect(() => {
    if (!isLoading && !locationsLoading) {
      setLastFetchAt(new Date().toISOString());
    }
  }, [attendance, isLoading, locations, locationsLoading]);

  const counts = useMemo(
    () => ({
      present: stats.present,
      absent: stats.absent,
      late: stats.late,
    }),
    [stats.absent, stats.late, stats.present],
  );

  const opsSummary = useMemo(() => {
    const activeGeofenceList = (geofences ?? []).filter((g) => g.isActive);
    const lastSync = [lastFetchAt, ...locations.map((l) => l.lastUpdated)]
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
      checkedIn: stats.checkedIn,
      inGeofence: stats.inGeofence,
      exceptions: stats.exceptions,
      activeGeofences: stats.activeGeofences,
      lastSync,
      siteLabel,
      geofenceActive: stats.activeGeofences > 0,
    };
  }, [geofences, lastFetchAt, locations, stats]);

  const renderItem = useCallback(
    ({ item }: { item: AttendanceRecord }) => (
      <AttendanceRecordCard
        item={item}
        canEdit={canEditShifts}
        onEdit={setEditingRecord}
      />
    ),
    [canEditShifts],
  );

  const handleRefresh = useCallback(() => {
    setUserRefreshing(true);
    void Promise.all([refetchStats()]).finally(() => {
      setLastFetchAt(new Date().toISOString());
      setUserRefreshing(false);
    });
  }, [refetchStats]);

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <LiveOperationsSummary
          checkedIn={opsSummary.checkedIn}
          inGeofence={opsSummary.inGeofence}
          exceptions={opsSummary.exceptions}
          activeGeofences={opsSummary.activeGeofences}
          lastSync={opsSummary.lastSync}
        />

        <LiveOfficerMap
          locations={locations ?? []}
          geofences={geofences ?? []}
          siteLabel={opsSummary.siteLabel}
          lastSync={opsSummary.lastSync}
          inGeofenceCount={opsSummary.inGeofence}
          geofenceActive={opsSummary.geofenceActive}
        />

        <AttendanceKpiStrip
          present={counts.present}
          absent={counts.absent}
          late={counts.late}
        />

        <View style={styles.recordsSectionHeader}>
          <Text style={styles.recordsSectionTitle}>Live records</Text>
          <Text style={styles.recordsSectionCount}>
            {(attendance ?? []).length} officer{(attendance ?? []).length === 1 ? '' : 's'}
          </Text>
        </View>
      </View>
    ),
    [
      attendance,
      counts.absent,
      counts.late,
      counts.present,
      geofences,
      locations,
      opsSummary,
    ],
  );

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
        <ErrorState message={queryErrorMessage(error)} onRetry={refetchStats} />
      </AdminScreenLayout>
    );
  }

  return (
    <RoleGuard requiredPermission="attendance.view">
      <AdminScreenLayout padded={false}>
        <View style={styles.page}>
          <FlatList
            data={attendance ?? []}
            keyExtractor={(r) => r.id}
            renderItem={renderItem}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={
              <RecordsEmptyState
                onAddGeofence={() => navigation.navigate('CreateGeofence', {})}
              />
            }
            contentContainerStyle={[adminScreenStyles.listContent, { paddingBottom: TOOLBAR_INSET }]}
            style={styles.flex}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            refreshing={userRefreshing}
            onRefresh={handleRefresh}
          />

          <View style={styles.toolbar}>
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
          onSaved={() => void refetchStats()}
        />
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  flex: { flex: 1 },
  listHeader: {
    gap: spacing.md,
    marginBottom: spacing.sm,
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
  summarySync: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'right',
  },
  summarySyncStale: {
    color: adminColors.badgePending,
  },
  syncColumn: {
    alignItems: 'flex-end',
    gap: 2,
  },
  staleHint: {
    fontSize: 10,
    fontWeight: '600',
    color: adminColors.badgePending,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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

  mapModule: {
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: adminColors.cardBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
  },
  mapModulePlaceholder: {
    height: MAP_HEIGHT,
    borderRadius: CARD_RADIUS,
    backgroundColor: adminColors.cardBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
  },
  mapClip: {
    height: MAP_HEIGHT,
    overflow: 'hidden',
    borderRadius: CARD_RADIUS,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlayTop: {
    position: 'absolute',
    top: 58,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  mapOverlayTopRight: {
    alignItems: 'flex-end',
  },
  mapPlaceActions: {
    position: 'absolute',
    right: spacing.sm,
    top: '48%',
    gap: spacing.xs,
  },
  placeActionBtn: {
    minWidth: 56,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeActionBtnSaved: {
    borderColor: adminColors.primary,
    backgroundColor: adminColors.primaryTint,
  },
  placeActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  mapOverlayBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderDefault,
    gap: 2,
  },
  mapSiteLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  mapSyncLabel: {
    fontSize: 12,
    color: colors.textSecondary,
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
  kpiCellPresent: {
    backgroundColor: adminColors.attendanceKpiCell.present,
  },
  kpiCellAbsent: {
    backgroundColor: adminColors.attendanceKpiCell.absent,
  },
  kpiCellLate: {
    backgroundColor: adminColors.attendanceKpiCell.late,
  },
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
  kpiValuePresent: {
    color: adminColors.badgeActive,
  },
  kpiValueAbsent: {
    color: adminColors.badgeBlocked,
  },
  kpiValueLate: {
    color: adminColors.badgePending,
  },
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

  recordCard: {
    backgroundColor: adminColors.cardBg,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
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

  recordsEmpty: {
    backgroundColor: adminColors.cardBg,
    borderRadius: CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
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

  editBtn: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xxs,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: adminColors.primary,
  },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: PAGE_PADDING,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
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
