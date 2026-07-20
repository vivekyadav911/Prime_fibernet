import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '@prime/ui';

import { ApprovalReasonDialog } from '@/components/attendance/ApprovalReasonDialog';
import { InfoRow } from '@/components/attendance/InfoRow';
import { LocationPermissionGate } from '@/components/attendance/LocationPermissionGate';
import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { OfficerScreenWrapper } from '@/components/officer';
import {
  useCheckIn,
  useCheckOut,
  useMyApprovalRequests,
  useRequestApproval,
  useTodayAttendance,
  useOfficerMonthAttendance,
} from '@/hooks/attendance/useAttendance';
import { useMyAssignedZones } from '@/hooks/attendance/useMyAssignedZones';
import { useOfficerAttendanceRealtimeSync } from '@/hooks/attendance/useOfficerAttendanceRealtimeSync';
import { navigateToOfficerSettingsLeave } from '@/navigation/officerShellNavigation';
import { locationService } from '@/services/LocationService';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import type { OfficerAttendanceStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { ApprovalType } from '@/types/attendance';
import { AttendanceActionError } from '@/utils/attendanceErrors';
import { confirmStartShift } from '@/utils/confirmShiftAction';
import { formatOutsideZoneDistance } from '@/utils/formatDistance';
import { queryErrorMessage } from '@/utils/queryError';

import { GeofenceStatusBanner } from './components/GeofenceStatusBanner';
import { AttendanceHistoryListItem } from './components/AttendanceHistoryListItem';

export function OfficerAttendanceDashboard() {
  const navigation = useNavigation<NativeStackNavigationProp<OfficerAttendanceStackParamList>>();
  const dispatch = useAppDispatch();
  useOfficerAttendanceRealtimeSync(true);

  const [approvalIntent, setApprovalIntent] = useState<'check_in' | 'check_out'>('check_in');
  const [reasonVisible, setReasonVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const { data: today, isLoading, isError, error, refetch } = useTodayAttendance();
  const {
    statusRows,
    recordsByDate,
    counts,
    recentStatusRows,
    officerId,
    isLoading: monthLoading,
  } = useOfficerMonthAttendance(month, year);
  const zones = useMyAssignedZones();
  const [checkIn] = useCheckIn();
  const [checkOut] = useCheckOut();
  const [requestApproval] = useRequestApproval();
  const { data: myApprovals, refetch: refetchApprovals } = useMyApprovalRequests();

  const pendingCheckIn = useMemo(
    () =>
      (myApprovals ?? []).find(
        (r) => r.status === 'pending' && r.type === 'out_of_zone_checkin',
      ) ?? null,
    [myApprovals],
  );
  const pendingCheckOut = useMemo(
    () =>
      (myApprovals ?? []).find(
        (r) => r.status === 'pending' && r.type === 'out_of_zone_checkout',
      ) ?? null,
    [myApprovals],
  );

  const isCheckedIn = Boolean(today?.checkInTime && !today?.checkOutTime);
  const shiftCompletedToday = Boolean(today?.checkInTime && today?.checkOutTime);
  const todayLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const presentCount = counts.present + counts.late;
  const absentCount = counts.absent;
  const leaveCount = counts.onLeave + counts.halfDay;
  const hasZone = zones.hasZone;

  const submitApproval = useCallback(
    async (reason: string, intent: 'check_in' | 'check_out') => {
      setActionLoading(true);
      try {
        let coords = zones.coords;
        if (!coords) {
          coords = await locationService.getCurrentLocation();
        }
        const approvalType: ApprovalType =
          intent === 'check_out' ? 'out_of_zone_checkout' : 'out_of_zone_checkin';
        await requestApproval({
          type: approvalType,
          reason,
          coords,
          geofenceId: zones.selectedZone?.id,
        });
        setReasonVisible(false);
        dispatch(
          enqueueToast({
            id: `toast-${Date.now()}`,
            type: 'success',
            message: 'Approval request submitted — waiting for admin.',
          }),
        );
        await Promise.all([refetch(), refetchApprovals()]);
      } catch (e) {
        if (e instanceof AttendanceActionError && e.code === 'pending_approval') {
          setReasonVisible(false);
          Alert.alert('Waiting for approval', e.message);
          await refetchApprovals();
          return;
        }
        if (e instanceof AttendanceActionError && e.code === 'shift_already_completed') {
          setReasonVisible(false);
          Alert.alert('Attendance complete', e.message);
          await refetch();
          return;
        }
        Alert.alert(
          'Request failed',
          e instanceof Error ? e.message : 'Could not submit approval request.',
        );
      } finally {
        setActionLoading(false);
      }
    },
    [dispatch, refetch, refetchApprovals, requestApproval, zones.coords, zones.selectedZone?.id],
  );

  const runInsideCheckIn = useCallback(async () => {
    setActionLoading(true);
    try {
      const result = await checkIn({
        uiSaysInside: true,
        selectedGeofenceId: zones.selectedZone?.id,
      });
      if (result.action === 'already_checked_in') {
        dispatch(
          enqueueToast({
            id: `toast-${Date.now()}`,
            type: 'info',
            message: 'You are already checked in for today.',
          }),
        );
      } else if (result.action === 'offline_queued') {
        dispatch(
          enqueueToast({
            id: `toast-${Date.now()}`,
            type: 'info',
            message: 'Check-in queued — will sync when online.',
          }),
        );
      } else if (result.action === 'checked_in') {
        dispatch(
          enqueueToast({
            id: `toast-${Date.now()}`,
            type: 'success',
            message: 'Checked in successfully.',
          }),
        );
      } else if (result.action === 'shift_already_completed') {
        Alert.alert(
          'Attendance complete',
          'Maximum one attendance is allowed per day. If there is an issue, contact your admin or officers.',
        );
      }
      refetch();
    } catch (e) {
      if (e instanceof AttendanceActionError && e.code === 'shift_already_completed') {
        Alert.alert('Attendance complete', e.message);
        refetch();
        return;
      }
      if (e instanceof AttendanceActionError && e.code === 'outside_zone') {
        Alert.alert('Outside zone', e.message, [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, request approval',
            onPress: () => {
              setApprovalIntent('check_in');
              setReasonVisible(true);
            },
          },
        ]);
        return;
      }
      Alert.alert('Check-in failed', e instanceof Error ? e.message : 'Could not check in.');
    } finally {
      setActionLoading(false);
    }
  }, [checkIn, dispatch, refetch, zones.selectedZone?.id]);

  const handleCheckInPress = useCallback(async () => {

    if (shiftCompletedToday) {
      Alert.alert(
        'Attendance complete',
        'Maximum one attendance is allowed per day. If there is an issue, contact your admin or officers.',
      );
      return;
    }

    if (!hasZone) {
      Alert.alert('No zone assigned', 'Contact your admin to assign a geofence before checking in.');
      return;
    }

    if (pendingCheckIn) {
      if (zones.geofenceStatus.isInside) {
        const ok = await confirmStartShift();
        if (!ok) return;
        await runInsideCheckIn();
        return;
      }
      const zoneChanged =
        !!zones.selectedZone?.id &&
        !!pendingCheckIn.geofenceId &&
        pendingCheckIn.geofenceId !== zones.selectedZone.id;
      if (!zoneChanged) {
        Alert.alert(
          'Waiting for approval',
          'Your out-of-zone check-in request is pending. You will be clocked in when an admin approves it, or you can check in normally once you are inside the zone.',
        );
        return;
      }
      // Zone changed — allow a new request for the new zone.
      setApprovalIntent('check_in');
      Alert.alert(
        'Zone changed',
        'Request approval for your newly selected zone?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Yes', onPress: () => setReasonVisible(true) },
        ],
      );
      return;
    }

    if (zones.geofenceStatus.isInside) {
      const ok = await confirmStartShift();
      if (!ok) return;
      await runInsideCheckIn();
      return;
    }

    Alert.alert(
      'Outside zone',
      'You are outside your assigned zone. Request approval to start your shift?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => {
            setApprovalIntent('check_in');
            setReasonVisible(true);
          },
        },
      ],
    );
  }, [hasZone, pendingCheckIn, runInsideCheckIn, shiftCompletedToday, zones.geofenceStatus.isInside, zones.selectedZone?.id]);

  const handleCheckOut = useCallback(async () => {
    if (pendingCheckOut) {
      Alert.alert('Waiting for approval', 'Your out-of-zone check-out request is already pending.');
      return;
    }
    setActionLoading(true);
    try {
      const result = await checkOut({
        uiSaysInside: zones.geofenceStatus.isInside,
        selectedGeofenceId: zones.selectedZone?.id,
      });
      if (result.action === 'not_checked_in') {
        Alert.alert('Not checked in', 'You need to check in before checking out.');
        return;
      }
      if (result.action === 'offline_queued') {
        dispatch(
          enqueueToast({
            id: `toast-${Date.now()}`,
            type: 'info',
            message: 'Check-out queued — will sync when online.',
          }),
        );
        return;
      }
      if (result.action === 'checked_out') {
        dispatch(
          enqueueToast({
            id: `toast-${Date.now()}`,
            type: 'success',
            message: 'Checked out successfully.',
          }),
        );
      }
      refetch();
    } catch (e) {
      if (e instanceof AttendanceActionError && e.code === 'outside_zone') {
        Alert.alert('Outside zone', e.message, [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, request approval',
            onPress: () => {
              setApprovalIntent('check_out');
              setReasonVisible(true);
            },
          },
        ]);
        return;
      }
      Alert.alert(
        'Check-out failed',
        e instanceof Error ? e.message : 'Could not complete check-out.',
      );
    } finally {
      setActionLoading(false);
    }
  }, [
    checkOut,
    dispatch,
    pendingCheckOut,
    refetch,
    zones.geofenceStatus.isInside,
    zones.selectedZone?.id,
  ]);

  const zoneLabel = !hasZone
    ? 'No zone assigned'
    : zones.geofenceStatus.isInside
      ? `Inside ${zones.selectedZone?.name ?? 'zone'}`
      : formatOutsideZoneDistance(
          zones.geofenceStatus.distance,
          zones.selectedZone?.geometry.shape === 'circle' ? zones.selectedZone.geometry.radius : null,
        ) ?? 'Outside assigned zone';

  if (isLoading || monthLoading) {
    return (
      <OfficerScreenWrapper scrollable={false}>
        <SkeletonLoader rows={8} />
      </OfficerScreenWrapper>
    );
  }

  if (isError) {
    return (
      <OfficerScreenWrapper scrollable={false}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </OfficerScreenWrapper>
    );
  }

  const durationMs =
    today?.checkInTime && isCheckedIn
      ? Date.now() - new Date(today.checkInTime).getTime()
      : 0;
  const durationH = Math.floor(durationMs / 3600000);
  const durationM = Math.floor((durationMs % 3600000) / 60000);

  const checkInLabel = shiftCompletedToday
    ? 'Attendance complete'
    : pendingCheckIn
      ? 'Waiting for approval'
      : actionLoading
        ? 'Working…'
        : 'Check in';

  const statusHeadline = isCheckedIn
    ? 'CHECKED IN'
    : shiftCompletedToday
      ? 'SHIFT COMPLETED'
      : 'NOT CHECKED IN';

  return (
    <LocationPermissionGate>
      <OfficerScreenWrapper
        onRefresh={async () => {
          await Promise.all([refetch(), refetchApprovals(), zones.refreshLocation()]);
        }}
      >
        <Text style={styles.monthTitle}>
          Attendance — {now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </Text>

        <GeofenceStatusBanner />

        <View style={styles.statusCard}>
          <Text style={styles.todayLabel}>TODAY: {todayLabel.split(',')[0]}</Text>
          <Text style={styles.statusLabel}>{statusHeadline}</Text>
          {today?.checkInTime ? (
            <Text style={styles.statusMeta}>
              Checked in: {new Date(today.checkInTime).toLocaleTimeString()} · Checked out:{' '}
              {today.checkOutTime ? new Date(today.checkOutTime).toLocaleTimeString() : '—'}
            </Text>
          ) : null}
          {isCheckedIn ? (
            <Text style={styles.duration}>
              Duration so far: {durationH}h {durationM}m
            </Text>
          ) : null}

          <InfoRow icon="📍" label="Zone" value={zoneLabel} />
          {shiftCompletedToday ? (
            <Text style={styles.pendingHint}>
              Maximum one attendance is allowed per day. If there is an issue, contact your admin or
              officers.
            </Text>
          ) : pendingCheckIn ? (
            <Text style={styles.pendingHint}>
              Approval pending — you will clock in when an admin approves, or check in once inside
              the zone.
            </Text>
          ) : null}

          {zones.status === 'multiple' ? (
            <View style={styles.zonePicker}>
              {zones.zones.map((z) => (
                <Pressable
                  key={z.id}
                  style={[
                    styles.zoneChip,
                    zones.selectedZone?.id === z.id && styles.zoneChipActive,
                  ]}
                  onPress={() => zones.setSelectedZoneId(z.id)}
                >
                  <Text
                    style={[
                      styles.zoneChipText,
                      zones.selectedZone?.id === z.id && styles.zoneChipTextActive,
                    ]}
                  >
                    {z.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            {isCheckedIn ? (
              <Button
                label={
                  pendingCheckOut
                    ? 'Waiting for approval'
                    : actionLoading
                      ? 'Checking out…'
                      : 'Check out'
                }
                onPress={() => void handleCheckOut()}
                disabled={actionLoading || Boolean(today?.checkOutTime)}
                style={styles.cta}
              />
            ) : shiftCompletedToday ? (
              <Button label={checkInLabel} onPress={() => void handleCheckInPress()} style={styles.cta} />
            ) : (
              <Button
                label={checkInLabel}
                onPress={() => void handleCheckInPress()}
                disabled={actionLoading || (!hasZone && !pendingCheckIn)}
                style={styles.cta}
              />
            )}
          </View>
        </View>

        <Text style={styles.summary}>
          Present: {presentCount} · Absent: {absentCount} · Leave: {leaveCount}
        </Text>

        <AttendanceCalendar
          year={year}
          month={month}
          statusRows={statusRows}
          selectedOfficerId={officerId}
        />

        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent records</Text>
          <Pressable
            style={styles.viewAll}
            onPress={() => navigation.navigate('AttendanceHistory')}
          >
            <Text style={styles.viewAllText}>View all →</Text>
          </Pressable>
        </View>
        {recentStatusRows.slice(0, 5).map((row) => (
          <AttendanceHistoryListItem
            key={row.shiftDate}
            row={row}
            record={recordsByDate.get(row.shiftDate)}
          />
        ))}
        {recentStatusRows.length === 0 ? (
          <Text style={styles.emptyRecent}>No attendance records this month yet.</Text>
        ) : null}

        <Pressable style={styles.leaveLink} onPress={() => navigateToOfficerSettingsLeave(navigation)}>
          <Text style={styles.leaveLinkText}>Apply Leave Request →</Text>
        </Pressable>

        {actionLoading ? <ActivityIndicator color={adminColors.primary} /> : null}

        <ApprovalReasonDialog
          visible={reasonVisible}
          title={
            approvalIntent === 'check_out'
              ? 'Request check-out approval'
              : 'Request shift start approval'
          }
          message="You can add a short note for admin, or submit without one."
          loading={actionLoading}
          onCancel={() => setReasonVisible(false)}
          onSubmit={(reason) => void submitApproval(reason, approvalIntent)}
        />
      </OfficerScreenWrapper>
    </LocationPermissionGate>
  );
}

const styles = StyleSheet.create({
  monthTitle: { fontSize: 18, fontWeight: '700', color: adminColors.primary, marginBottom: spacing.md },
  todayLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xxs },
  statusCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginBottom: spacing.md,
  },
  statusLabel: { fontSize: 18, fontWeight: '700', color: adminColors.primary },
  statusMeta: { fontSize: 13, color: colors.textSecondary },
  duration: { fontSize: 14, fontWeight: '600', color: colors.accentTeal },
  pendingHint: { fontSize: 13, color: colors.amber, lineHeight: 18 },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  cta: { minHeight: 48 },
  summary: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: adminColors.primary },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  viewAll: { minHeight: 48, justifyContent: 'center' },
  viewAllText: { color: colors.accentTeal, fontWeight: '600', fontSize: 14 },
  emptyRecent: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm },
  leaveLink: { minHeight: 48, justifyContent: 'center', marginTop: spacing.md },
  leaveLinkText: { color: colors.accentTeal, fontWeight: '600', fontSize: 15 },
  zonePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  zoneChip: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  zoneChipActive: { borderColor: adminColors.primary, backgroundColor: colors.surfaceWhite },
  zoneChipText: { fontSize: 12, color: colors.textSecondary },
  zoneChipTextActive: { color: adminColors.primary, fontWeight: '600' },
});
