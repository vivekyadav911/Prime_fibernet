import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { FlatList, StyleSheet, Text } from 'react-native';
import { Button, Screen, StatusChip, colors } from '@prime/ui';

import { useAppSelector } from '@/store/hooks';
import {
  useClockInMutation,
  useClockOutMutation,
  useGetActiveShiftQuery,
  useGetShiftHistoryQuery,
} from '@/store/api/endpoints';

export function OfficerShiftsScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: activeShift, refetch: refetchActive } = useGetActiveShiftQuery(user?.id ?? '', { skip: !user?.id });
  const { data: history, refetch: refetchHistory } = useGetShiftHistoryQuery(user?.id ?? '', { skip: !user?.id });
  const [clockIn, { isLoading: clockingIn }] = useClockInMutation();
  const [clockOut, { isLoading: clockingOut }] = useClockOutMutation();
  const [locationError, setLocationError] = useState<string | null>(null);

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
    refetchActive();
    refetchHistory();
  };

  const onClockOut = async () => {
    if (!user) return;
    await clockOut({ userId: user.id, shiftId: activeShift?.id });
    refetchActive();
    refetchHistory();
  };

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
      <FlatList
        data={history ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text style={styles.historyRow}>
            {item.shiftDate} — <StatusChip status={item.status} />
          </Text>
        )}
        ListEmptyComponent={<Text style={styles.muted}>No shift history</Text>}
      />
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
