import { FlatList, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { Button, Screen, StatusChip, colors } from '@prime/ui';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { useAppSelector } from '@/store/hooks';
import { useGetAssignedRequestsQuery, useClockInMutation } from '@/store/api/endpoints';
import { queryErrorMessage } from '@/utils/queryError';

export function OfficerDashboardScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: requests, isLoading, isError, error, refetch } = useGetAssignedRequestsQuery(user?.id, {
    skip: !user?.id,
  });
  const [clockIn] = useClockInMutation();

  const newCount = requests?.filter((r) => r.status === 'pending').length ?? 0;
  const inProgress = requests?.filter((r) => r.status === 'working').length ?? 0;

  const onClockIn = async () => {
    if (!user) return;
    const { status } = await Location.requestForegroundPermissionsAsync();
    const coords =
      status === 'granted'
        ? await Location.getCurrentPositionAsync({})
        : { coords: { latitude: 0, longitude: 0 } };
    await clockIn({ userId: user.id, latitude: coords.coords.latitude, longitude: coords.coords.longitude });
  };

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={3} tall />
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
      <View style={styles.shiftCard}>
        <Text style={styles.shiftTitle}>Today&apos;s shift</Text>
        <Button label="Clock in" onPress={onClockIn} />
      </View>
      <View style={styles.chips}>
        <Text style={styles.chip}>New: {newCount}</Text>
        <Text style={styles.chip}>In progress: {inProgress}</Text>
      </View>
      {!requests?.length ? (
        <EmptyState title="No assignments" subtitle="New requests will appear here" icon="📋" />
      ) : (
        <FlatList
          data={requests.slice(0, 3)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.capitalize}>{item.requestType}</Text>
              <StatusChip status={item.priority} />
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  shiftCard: { backgroundColor: colors.primaryNavy, padding: 16, borderRadius: 12, marginBottom: 16 },
  shiftTitle: { color: colors.white, fontSize: 18, marginBottom: 12 },
  chips: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  chip: { backgroundColor: colors.background, padding: 8, borderRadius: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  capitalize: { textTransform: 'capitalize' },
});
