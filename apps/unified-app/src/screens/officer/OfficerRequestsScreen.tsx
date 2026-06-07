import { FlatList, StyleSheet, Text, View } from 'react-native';
import { EmptyState, Screen, colors } from '@prime/ui';

import { useAppSelector } from '@/store/hooks';
import { useGetAssignedRequestsQuery, useUpdateRequestStatusMutation } from '@/store/api/endpoints';

export function OfficerRequestsScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data } = useGetAssignedRequestsQuery(user?.id ?? '', { skip: !user?.id });
  const [updateStatus] = useUpdateRequestStatusMutation();

  if (!data?.length) {
    return (
      <Screen>
        <EmptyState title="No requests" description="Assigned jobs will show here" />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.type}>{item.requestType}</Text>
              <Text style={styles.address}>{item.address}</Text>
            </View>
            <Text style={styles.action} onPress={() => updateStatus({ id: item.id, status: 'working' })}>
              Start
            </Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  type: { textTransform: 'capitalize', fontWeight: '600' },
  address: { color: colors.textSecondary, fontSize: 12 },
  action: { color: colors.accentTeal, fontWeight: '600' },
});
