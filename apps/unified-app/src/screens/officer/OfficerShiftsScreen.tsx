import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { FlatList, StyleSheet, Text } from 'react-native';
import { Button, Screen, StatusChip, colors } from '@prime/ui';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { useAppSelector } from '@/store/hooks';
import {
  useClockInMutation,
  useClockOutMutation,
  useGetActiveShiftQuery,
  useGetShiftHistoryQuery,
} from '@/store/api/endpoints';
import { queryErrorMessage } from '@/utils/queryError';

export function OfficerShiftsScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const {
    data: activeShift,
    isLoading: activeLoading,
    isError: activeError,
    error: activeErr,
    refetch: refetchActive,
  } = useGetActiveShiftQuery(user?.id ?? '', { skip: !user?.id });
  const {
    data: history,
    isLoading: historyLoading,
    isError: historyError,
    error: historyErr,
    refetch: refetchHistory,
  } = useGetShiftHistoryQuery(user?.id ?? '', { skip: !user?.id });
  const [clockIn, { isLoading: clockingIn }] = useClockInMutation();
  const [clockOut, { isLoading: clockingOut }] = useClockOutMutation();
  const [locationError, setLocationError] = useState<string | null>(null);

  const isLoading = activeLoading || historyLoading;
  const isError = activeError || historyError;
  const error = activeErr ?? historyErr;

  const refetch = () => {
    refetchActive();
    refetchHistory();
  };

  useEffect(() => {
    void Location.requestForegroundPermissionsAsync();
  }, []);

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationError('Location permission denied');
      return { latitude: 0, longitude: 0 };
    }
    const loc = await Location.getCurrentPositionAsync({});
    return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
  };

  const onClockIn = async () => {
    if (!user) return;
    const coords = await getLocation();
    await clockIn({ userId: user.id, ...coords });
    refetch();
  };

  const onClockOut = async () => {
    if (!user) return;
    await clockOut({ userId: user.id, shiftId: activeShift?.id });
    refetch();
  };

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={6} showAvatar />
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

  return (
    <Screen>
      <Text style={styles.title}>Attendance</Text>
      <Text style={styles.subtitle}>GPS coordinates recorded on clock in/out</Text>
      {locationError ? <Text style={styles.error}>{locationError}</Text> : null}
      {activeShift ? (
        <Text style={styles.active}>On shift since {new Date(activeShift.checkInTime ?? '').toLocaleTimeString()}</Text>
      ) : (
        <Text style={styles.muted}>Not clocked in</Text>
      )}
      {!activeShift ? (
        <Button label={clockingIn ? 'Clocking in…' : 'Clock in'} onPress={onClockIn} style={styles.btn} />
      ) : (
        <Button label={clockingOut ? 'Clocking out…' : 'Clock out'} variant="secondary" onPress={onClockOut} />
      )}
      <Text style={styles.historyTitle}>Shift history</Text>
      {!history?.length ? (
        <EmptyState title="No shifts scheduled" subtitle="Check back with your admin" icon="📅" />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Text style={styles.historyRow}>
              {item.shiftDate} — <StatusChip status={item.status} />
            </Text>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '600' },
  subtitle: { color: colors.textSecondary, marginVertical: 12 },
  active: { color: colors.successGreen, fontWeight: '600', marginBottom: 12 },
  muted: { color: colors.textSecondary, marginBottom: 12 },
  error: { color: colors.errorRed, marginBottom: 8 },
  btn: { marginBottom: 12 },
  historyTitle: { fontWeight: '600', marginTop: 24, marginBottom: 8 },
  historyRow: { paddingVertical: 6, color: colors.textSecondary },
});
