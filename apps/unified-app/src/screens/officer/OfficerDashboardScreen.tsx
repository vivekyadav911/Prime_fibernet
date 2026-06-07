import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Button, EmptyState, Screen, colors } from '@prime/ui';

import { useAppSelector } from '@/store/hooks';
import { useGetAssignedRequestsQuery, useClockInMutation } from '@/store/api/endpoints';

export function OfficerDashboardScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: requests } = useGetAssignedRequestsQuery(user?.id ?? '', { skip: !user?.id });
  const [clockIn] = useClockInMutation();

  const newCount = requests?.filter((r) => r.status === 'pending').length ?? 0;
  const inProgress = requests?.filter((r) => r.status === 'working').length ?? 0;

  return (
    <Screen>
      <View style={styles.shiftCard}>
        <Text style={styles.shiftTitle}>Today&apos;s shift</Text>
        <Button
          label="Clock in"
          onPress={() => clockIn({ officerId: user?.id ?? '', latitude: 0, longitude: 0 })}
        />
      </View>
      <View style={styles.chips}>
        <Text style={styles.chip}>New: {newCount}</Text>
        <Text style={styles.chip}>In progress: {inProgress}</Text>
      </View>
      {!requests?.length ? (
        <EmptyState title="No assignments" description="New requests will appear here" />
      ) : (
        <FlatList
          data={requests.slice(0, 3)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text>{item.requestType}</Text>
              <Text style={styles.priority}>{item.priority}</Text>
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
  priority: { color: colors.errorRed, fontWeight: '600' },
});
