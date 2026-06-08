import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, EmptyState, Screen, StatusChip, colors } from '@prime/ui';

import { SyncManager } from '@/services/offline/syncManager';
import { useAppSelector } from '@/store/hooks';
import { useGetAssignedRequestsQuery, useUpdateRequestStatusMutation } from '@/store/api/endpoints';
import type { OfficerStackParamList } from '@/types/navigation';

const STATUS_FLOW: Record<string, string | null> = {
  pending: 'working',
  assigned: 'working',
  working: 'resolved',
  in_transit: 'on_site',
  on_site: 'working',
};

export function OfficerRequestsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OfficerStackParamList>>();
  const user = useAppSelector((s) => s.auth.user);
  const { data: requests, refetch } = useGetAssignedRequestsQuery(user?.id, { skip: !user?.id });
  const [updateStatus] = useUpdateRequestStatusMutation();

  const sorted = [...(requests ?? [])].sort((a, b) => a.priority.localeCompare(b.priority));

  const onAdvance = async (id: string, currentStatus: string) => {
    const next = STATUS_FLOW[currentStatus];
    if (!next) return;
    const execute = () => updateStatus({ id, status: next, note: `Status changed to ${next}` }).unwrap();
    try {
      await execute();
    } catch {
      await SyncManager.enqueue({
        id: `${id}-${next}-${Date.now()}`,
        endpoint: 'updateRequestStatus',
        payload: { id, status: next, note: `Status changed to ${next}` },
      });
    }
    refetch();
  };

  return (
    <Screen padded={false}>
      {!sorted.length ? (
        <EmptyState title="No requests" description="Assigned requests will appear here" />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => navigation.navigate('RequestDetail', { requestId: item.id })}>
              <View style={styles.header}>
                <Text style={styles.type}>{item.requestType}</Text>
                <StatusChip status={item.priority} />
              </View>
              <Text style={styles.address}>{item.address}</Text>
              <StatusChip status={item.status} />
              {STATUS_FLOW[item.status] ? (
                <Button
                  label={item.status === 'working' ? 'Mark resolved' : 'Start work'}
                  onPress={() => onAdvance(item.id, item.status)}
                  style={styles.btn}
                />
              ) : null}
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderBottomWidth: 1, borderColor: colors.borderDefault, gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { textTransform: 'capitalize', fontWeight: '600', fontSize: 16 },
  address: { color: colors.textSecondary },
  btn: { marginTop: 8 },
});
