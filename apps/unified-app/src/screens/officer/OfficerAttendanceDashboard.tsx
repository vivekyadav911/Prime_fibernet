import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import { Button } from '@prime/ui';

import { CheckInSheet } from '@/components/attendance/CheckInSheet';
import { InfoRow } from '@/components/attendance/InfoRow';
import { LocationPermissionGate } from '@/components/attendance/LocationPermissionGate';
import { ErrorState, ScreenWrapper, SkeletonLoader } from '@/components/common';
import {
  useCheckIn,
  useCheckOut,
  useLiveGeofenceStatus,
  useRequestApproval,
  useTodayAttendance,
  useAttendanceHistory,
} from '@/hooks/attendance/useAttendance';
import { locationService } from '@/services/LocationService';
import type { OfficerDrawerParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

import { GeofenceStatusBanner } from './components/GeofenceStatusBanner';
import { MonthCalendar } from './components/MonthCalendar';

export function OfficerAttendanceDashboard() {
  const navigation = useNavigation<DrawerNavigationProp<OfficerDrawerParamList>>();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [sheetMode, setSheetMode] = useState<'check_in' | 'approval'>('check_in');
  const [limitedMode, setLimitedMode] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const now = new Date();
  const { data: today, isLoading, isError, error, refetch } = useTodayAttendance();
  const { data: history } = useAttendanceHistory({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });
  const geo = useLiveGeofenceStatus();
  const [checkIn] = useCheckIn();
  const [checkOut] = useCheckOut();
  const [requestApproval] = useRequestApproval();

  useEffect(() => {
    void locationService.startBackgroundTracking().catch(() => undefined);
    return () => {
      void locationService.stopBackgroundTracking();
    };
  }, []);

  const isCheckedIn = Boolean(today?.checkInTime && !today?.checkOutTime);
  const todayLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const presentCount = (history ?? []).filter((r) => r.status === 'present' || r.checkInTime).length;
  const absentCount = (history ?? []).filter((r) => r.status === 'absent').length;
  const leaveCount = (history ?? []).filter((r) => r.status === 'leave').length;

  const openCheckInSheet = useCallback(() => {
    setSheetMode('check_in');
    sheetRef.current?.present();
  }, []);

  const openApprovalSheet = useCallback(() => {
    setSheetMode('approval');
    sheetRef.current?.present();
  }, []);

  const handleConfirm = useCallback(
    async (payload: { notes?: string; reason?: string }) => {
      setActionLoading(true);
      try {
        if (sheetMode === 'check_in') {
          const result = await checkIn({ notes: payload.notes });
          if (result.action === 'needs_approval') {
            setSheetMode('approval');
            return;
          }
        } else {
          const coords = geo.currentLocation ?? (await locationService.getCurrentLocation());
          await requestApproval({
            type: 'out_of_zone_checkin',
            reason: payload.reason ?? '',
            coords,
            date: new Date().toISOString().slice(0, 10),
          });
        }
        sheetRef.current?.dismiss();
        refetch();
      } finally {
        setActionLoading(false);
      }
    },
    [checkIn, geo.currentLocation, refetch, requestApproval, sheetMode],
  );

  const handleCheckOut = useCallback(async () => {
    setActionLoading(true);
    try {
      const result = await checkOut();
      if (result.action === 'needs_approval') {
        setSheetMode('approval');
        sheetRef.current?.present();
      } else {
        refetch();
      }
    } finally {
      setActionLoading(false);
    }
  }, [checkOut, refetch]);

  if (isLoading) {
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

  const coords = geo.currentLocation ?? { latitude: 28.6139, longitude: 77.209 };
  const durationMs =
    today?.checkInTime && isCheckedIn
      ? Date.now() - new Date(today.checkInTime).getTime()
      : 0;
  const durationH = Math.floor(durationMs / 3600000);
  const durationM = Math.floor((durationMs % 3600000) / 60000);

  return (
    <LocationPermissionGate limitedMode={limitedMode} onLimitedMode={() => setLimitedMode(true)}>
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

          <InfoRow
            icon="📍"
            label="Zone"
            value={
              geo.isInsideGeofence
                ? `Inside ${geo.activeGeofence?.name ?? 'zone'}`
                : `${Math.round(geo.distanceFromFence)}m away`
            }
          />

          <View style={styles.actions}>
            {!isCheckedIn ? (
              <>
                <Button
                  label="Check in"
                  onPress={openCheckInSheet}
                  disabled={actionLoading}
                  style={styles.cta}
                />
                <Button
                  label="Request approval"
                  variant="secondary"
                  onPress={openApprovalSheet}
                  disabled={geo.isInsideGeofence || actionLoading}
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

        <MonthCalendar month={now.getMonth() + 1} year={now.getFullYear()} />

        <Text style={styles.sectionTitle}>Recent records</Text>
        {(history ?? []).slice(0, 5).map((r) => (
          <View key={r.id} style={styles.recordRow}>
            <Text style={styles.recordDate}>{r.date}</Text>
            <Text style={styles.recordStatus}>{r.status}</Text>
            {r.workingHours != null ? (
              <Text style={styles.recordHours}>{r.workingHours}h</Text>
            ) : null}
          </View>
        ))}

        <Pressable style={styles.leaveLink} onPress={() => navigation.navigate('LeaveStack')}>
          <Text style={styles.leaveLinkText}>Apply Leave Request →</Text>
        </Pressable>

        {actionLoading ? <ActivityIndicator color={colors.primaryNavy} /> : null}

        <CheckInSheet
          ref={sheetRef}
          mode={sheetMode}
          geofence={geo.activeGeofence}
          coords={coords}
          distance={geo.distanceFromFence}
          isInside={geo.isInsideGeofence}
          onConfirm={(p) => void handleConfirm(p)}
          onDismiss={() => undefined}
          isLoading={actionLoading}
        />
      </ScreenWrapper>
    </LocationPermissionGate>
  );
}

const styles = StyleSheet.create({
  monthTitle: { fontSize: 18, fontWeight: '700', color: colors.primaryNavy, marginBottom: spacing.md },
  todayLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xxs },
  statusCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginBottom: spacing.md,
  },
  statusLabel: { fontSize: 18, fontWeight: '700', color: colors.primaryNavy },
  statusMeta: { fontSize: 13, color: colors.textSecondary },
  duration: { fontSize: 14, fontWeight: '600', color: colors.accentTeal },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  cta: { minHeight: 48 },
  summary: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primaryNavy, marginBottom: spacing.sm },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  recordDate: { flex: 1, color: colors.textPrimary },
  recordStatus: { color: colors.textSecondary, textTransform: 'capitalize' },
  recordHours: { color: colors.textSecondary, fontSize: 12 },
  leaveLink: { minHeight: 48, justifyContent: 'center', marginTop: spacing.md },
  leaveLinkText: { color: colors.accentTeal, fontWeight: '600', fontSize: 15 },
});
