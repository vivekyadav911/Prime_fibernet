import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Circle, Marker } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { CheckInSheet } from '@/components/attendance/CheckInSheet';
import { InfoRow } from '@/components/attendance/InfoRow';
import { LocationPermissionGate } from '@/components/attendance/LocationPermissionGate';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { FreeMapView } from '@/components/map';
import {
  useCheckIn,
  useCheckOut,
  useLiveGeofenceStatus,
  useRequestApproval,
  useTodayAttendance,
} from '@/hooks/attendance/useAttendance';
import { locationService } from '@/services/LocationService';
import type { OfficerDrawerParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<OfficerDrawerParamList, 'Shifts'>;

export function OfficerAttendanceDashboard({ navigation }: Props) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [sheetMode, setSheetMode] = useState<'check_in' | 'approval'>('check_in');
  const [limitedMode, setLimitedMode] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { data: today, isLoading, isError, error, refetch } = useTodayAttendance();
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
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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
      <Screen>
        <SkeletonLoader rows={8} />
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

  const coords = geo.currentLocation ?? { latitude: 28.6139, longitude: 77.209 };

  return (
    <LocationPermissionGate limitedMode={limitedMode} onLimitedMode={() => setLimitedMode(true)}>
      <Screen>
        <Text style={styles.date}>{todayLabel}</Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>
            {isCheckedIn ? 'CHECKED IN' : 'NOT CHECKED IN'}
          </Text>
          {isCheckedIn && today?.checkInTime ? (
            <Text style={styles.statusMeta}>
              Since {new Date(today.checkInTime).toLocaleTimeString()}
            </Text>
          ) : null}

          <InfoRow
            icon="📍"
            label="Zone status"
            value={
              geo.isInsideGeofence
                ? `Inside ${geo.activeGeofence?.name ?? 'zone'} (${Math.round(geo.distanceFromFence)}m)`
                : `Outside zone (${geo.distanceFromFence < 1000 ? `${Math.round(geo.distanceFromFence)}m` : `${(geo.distanceFromFence / 1000).toFixed(1)}km`})`
            }
          />

          <View style={styles.actions}>
            {!isCheckedIn ? (
              <>
                <Button
                  label="Check in"
                  onPress={openCheckInSheet}
                  disabled={!geo.isInsideGeofence || actionLoading}
                />
                <Button
                  label="Request approval"
                  variant="secondary"
                  onPress={openApprovalSheet}
                  disabled={geo.isInsideGeofence || actionLoading}
                />
              </>
            ) : (
              <Button
                label={actionLoading ? 'Checking out…' : 'Check out'}
                onPress={() => void handleCheckOut()}
                disabled={actionLoading}
              />
            )}
          </View>
        </View>

        <FreeMapView
          style={styles.map}
          region={{
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          <Marker coordinate={coords} title="You" />
          {geo.activeGeofence?.geometry.shape === 'circle' ? (
            <Circle
              center={geo.activeGeofence.geometry.center}
              radius={geo.activeGeofence.geometry.radius}
              strokeColor={colors.accentTeal}
              fillColor="rgba(13,115,119,0.15)"
            />
          ) : null}
        </FreeMapView>

        <View style={styles.links}>
          <Button label="History" variant="ghost" onPress={() => navigation.navigate('AttendanceHistory')} />
          <Button label="Leave" variant="ghost" onPress={() => navigation.navigate('Leave')} />
          <Button label="Refresh location" variant="ghost" onPress={() => void geo.refresh()} />
        </View>

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
      </Screen>
    </LocationPermissionGate>
  );
}

const styles = StyleSheet.create({
  date: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm },
  statusCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginBottom: spacing.md,
  },
  statusLabel: { fontSize: 20, fontWeight: '700', color: colors.primaryNavy, textAlign: 'center' },
  statusMeta: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  map: { height: 180, borderRadius: 12, overflow: 'hidden', marginBottom: spacing.md },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
