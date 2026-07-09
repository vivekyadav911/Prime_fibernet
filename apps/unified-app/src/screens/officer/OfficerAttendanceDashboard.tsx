import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { Button } from '@prime/ui';

import { CheckInSheet } from '@/components/attendance/CheckInSheet';
import { InfoRow } from '@/components/attendance/InfoRow';
import { LocationPermissionGate } from '@/components/attendance/LocationPermissionGate';
import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar';
import { ErrorState, ScreenWrapper, SkeletonLoader } from '@/components/common';
import {
  useCheckIn,
  useCheckOut,
  useRequestApproval,
  useTodayAttendance,
  useOfficerMonthAttendance,
} from '@/hooks/attendance/useAttendance';
import { useMyAssignedZones } from '@/hooks/attendance/useMyAssignedZones';
import { locationService } from '@/services/LocationService';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import type { OfficerDrawerParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { ApprovalType } from '@/types/attendance';
import { AttendanceActionError } from '@/utils/attendanceErrors';
import { formatOutsideZoneDistance } from '@/utils/formatDistance';
import { queryErrorMessage } from '@/utils/queryError';

import { GeofenceStatusBanner } from './components/GeofenceStatusBanner';
import { AttendanceHistoryListItem } from './components/AttendanceHistoryListItem';

export function OfficerAttendanceDashboard() {
  const navigation = useNavigation<DrawerNavigationProp<OfficerDrawerParamList>>();
  const dispatch = useAppDispatch();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [sheetMode, setSheetMode] = useState<'check_in' | 'approval'>('check_in');
  const [approvalIntent, setApprovalIntent] = useState<'check_in' | 'check_out'>('check_in');
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

  useEffect(() => {
    void locationService.clearGeofenceCache().then(() => zones.refreshZones());
    void locationService.startBackgroundTracking().catch(() => undefined);
    void locationService.verifyGeofenceRegistration();
    return () => {
      void locationService.stopBackgroundTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCheckedIn = Boolean(today?.checkInTime && !today?.checkOutTime);
  const todayLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const presentCount = counts.present + counts.late;
  const absentCount = counts.absent;
  const leaveCount = counts.onLeave + counts.halfDay;

  const openCheckInSheet = useCallback(() => {
    setSheetMode('check_in');
    sheetRef.current?.present();
  }, []);

  const openApprovalSheet = useCallback((intent: 'check_in' | 'check_out' = 'check_in') => {
    setApprovalIntent(intent);
    setSheetMode('approval');
    sheetRef.current?.present();
  }, []);

  const handleConfirm = useCallback(
    async (payload: { notes?: string; reason?: string }) => {
      setActionLoading(true);
      try {
        if (sheetMode === 'check_in') {
          const result = await checkIn({
            notes: payload.notes,
            uiSaysInside: zones.geofenceStatus.isInside,
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
            sheetRef.current?.dismiss();
            refetch();
            return;
          }
          if (result.action === 'offline_queued') {
            dispatch(
              enqueueToast({
                id: `toast-${Date.now()}`,
                type: 'info',
                message: 'Check-in queued — will sync when online.',
              }),
            );
            sheetRef.current?.dismiss();
            return;
          }
          if (result.action === 'checked_in') {
            dispatch(
              enqueueToast({
                id: `toast-${Date.now()}`,
                type: 'success',
                message: 'Checked in successfully.',
              }),
            );
          }
        } else {
          const coords = zones.coords ?? (await locationService.getCurrentLocation());
          const approvalType: ApprovalType =
            approvalIntent === 'check_out' ? 'out_of_zone_checkout' : 'out_of_zone_checkin';
          await requestApproval({
            type: approvalType,
            reason: payload.reason ?? '',
            coords,
            date: new Date().toISOString().slice(0, 10),
            geofenceId: zones.selectedZone?.id,
          });
          dispatch(
            enqueueToast({
              id: `toast-${Date.now()}`,
              type: 'success',
              message: 'Approval request submitted.',
            }),
          );
        }
        sheetRef.current?.dismiss();
        refetch();
      } catch (e) {
        if (e instanceof AttendanceActionError && e.code === 'outside_zone') {
          Alert.alert('Outside zone', e.message, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Request approval',
              onPress: () => {
                setApprovalIntent('check_in');
                setSheetMode('approval');
                sheetRef.current?.present();
              },
            },
          ]);
          return;
        }
        Alert.alert(
          'Attendance failed',
          e instanceof Error ? e.message : 'Could not complete attendance action.',
        );
      } finally {
        setActionLoading(false);
      }
    },
    [approvalIntent, checkIn, dispatch, refetch, requestApproval, sheetMode, zones.coords, zones.geofenceStatus.isInside, zones.selectedZone?.id],
  );

  const handleCheckOut = useCallback(async () => {
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
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Request approval',
            onPress: () => {
              setApprovalIntent('check_out');
              setSheetMode('approval');
              sheetRef.current?.present();
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
  }, [checkOut, dispatch, refetch, zones.geofenceStatus.isInside, zones.selectedZone?.id]);

  const hasZone = zones.hasZone;
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
      <ScreenWrapper scrollable={false}>
        <SkeletonLoader rows={8} />
      </ScreenWrapper>
    );
  }

  if (isError) {
    return (
      <ScreenWrapper scrollable={false}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </ScreenWrapper>
    );
  }

  const coords = zones.coords ?? { latitude: 28.6139, longitude: 77.209 };
  const durationMs =
    today?.checkInTime && isCheckedIn
      ? Date.now() - new Date(today.checkInTime).getTime()
      : 0;
  const durationH = Math.floor(durationMs / 3600000);
  const durationM = Math.floor((durationMs % 3600000) / 60000);

  return (
    <LocationPermissionGate>
      <ScreenWrapper>
        <Text style={styles.monthTitle}>
          Attendance — {now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </Text>

        <GeofenceStatusBanner />

        <View style={styles.statusCard}>
          <Text style={styles.todayLabel}>TODAY: {todayLabel.split(',')[0]}</Text>
          <Text style={styles.statusLabel}>{isCheckedIn ? 'CHECKED IN' : 'NOT CHECKED IN'}</Text>
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
            {!isCheckedIn ? (
              <>
                <Button
                  label="Check in"
                  onPress={openCheckInSheet}
                  disabled={actionLoading || !hasZone || !zones.geofenceStatus.isInside}
                  style={styles.cta}
                />
                <Button
                  label="Request approval"
                  variant="secondary"
                  onPress={() => openApprovalSheet('check_in')}
                  disabled={actionLoading}
                  style={styles.cta}
                />
              </>
            ) : (
              <Button
                label={actionLoading ? 'Checking out…' : 'Check out'}
                onPress={() => void handleCheckOut()}
                disabled={actionLoading || Boolean(today?.checkOutTime)}
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

        <Pressable style={styles.leaveLink} onPress={() => navigation.navigate('LeaveStack')}>
          <Text style={styles.leaveLinkText}>Apply Leave Request →</Text>
        </Pressable>

        {actionLoading ? <ActivityIndicator color={adminColors.primary} /> : null}

        <CheckInSheet
          ref={sheetRef}
          mode={sheetMode}
          geofence={zones.selectedZone}
          coords={coords}
          distance={zones.geofenceStatus.distance ?? 0}
          isInside={zones.geofenceStatus.isInside}
          onConfirm={(p) => void handleConfirm(p)}
          onDismiss={() => undefined}
          isLoading={actionLoading}
        />
      </ScreenWrapper>
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
