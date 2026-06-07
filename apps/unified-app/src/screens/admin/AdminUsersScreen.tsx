import { FlatList, StyleSheet, Text, View } from 'react-native';
import { EmptyState, Screen, colors } from '@prime/ui';

import { useGetAllUsersQuery, useBlockUserMutation } from '@/store/api/endpoints';

export function AdminUsersScreen() {
  const { data } = useGetAllUsersQuery();
  const [blockUser] = useBlockUserMutation();

  if (!data?.length) {
    return (
      <Screen>
        <EmptyState title="No users" description="Users will appear when database is seeded" />
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
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.email}>{item.email}</Text>
            </View>
            {!item.isBlocked ? (
              <Text style={styles.block} onPress={() => blockUser({ userId: item.id, reason: 'Admin action' })}>
                Block
              </Text>
            ) : (
              <Text style={styles.blocked}>Blocked</Text>
            )}
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  name: { fontWeight: '600' },
  email: { color: colors.textSecondary, fontSize: 12 },
  block: { color: colors.errorRed },
  blocked: { color: colors.textSecondary },
});
