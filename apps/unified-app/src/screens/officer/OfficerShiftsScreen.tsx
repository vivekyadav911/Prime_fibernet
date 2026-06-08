import { useCallback } from 'react';
import { FlatList } from 'react-native';
import type { Shift } from '@prime/types';
import { Button, Screen, colors } from '@prime/ui';
import { StyleSheet, Text } from 'react-native';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { useLocation } from '@/hooks/useLocation';
import { useAppSelector } from '@/store/hooks';
import {
  useClockInMutation,
  useClockOutMutation,
  useGetActiveShiftQuery,
  useGetShiftHistoryQuery,
} from '@/store/api/endpoints';
import { queryErrorMessage } from '@/utils/queryError';

import { ShiftRow } from './components/ShiftRow';

export function OfficerShiftsScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { coords, error: locationError, startTracking, stopTracking } = useLocation({
    enableBackground: true,
  });
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

  const isLoading = activeLoading || historyLoading;
  const isError = activeError || historyError;
  const error = activeErr ?? historyErr;

  const refetch = useCallback(() => {
    refetchActive();
    refetchHistory();
  }, [refetchActive, refetchHistory]);

  const handleClockIn = useCallback(async () => {
    if (!user) return;
    const position = await startTracking();
    const latitude = position?.latitude ?? coords?.latitude ?? 0;
    const longitude = position?.longitude ?? coords?.longitude ?? 0;
    await clockIn({ userId: user.id, latitude, longitude });
    refetch();
  }, [clockIn, coords?.latitude, coords?.longitude, refetch, startTracking, user]);

  const handleClockOut = useCallback(async () => {
    if (!user) return;
    await clockOut({ userId: user.id, shiftId: activeShift?.id });
    stopTracking();
    refetch();
  }, [activeShift?.id, clockOut, refetch, stopTracking, user]);

  const keyExtractor = useCallback((item: Shift) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: Shift }) => <ShiftRow shift={item} />,
    [],
  );

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
        <Button label={clockingIn ? 'Clocking in…' : 'Clock in'} onPress={handleClockIn} style={styles.btn} />
      ) : (
        <Button label={clockingOut ? 'Clocking out…' : 'Clock out'} variant="secondary" onPress={handleClockOut} />
      )}
      <Text style={styles.historyTitle}>Shift history</Text>
      {!history?.length ? (
        <EmptyState title="No shifts scheduled" subtitle="Check back with your admin" icon="📅" />
      ) : (
        <FlatList data={history} keyExtractor={keyExtractor} renderItem={renderItem} />
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
});
