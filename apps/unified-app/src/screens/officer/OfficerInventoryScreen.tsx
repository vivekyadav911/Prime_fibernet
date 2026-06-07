import { FlatList, StyleSheet, Text } from 'react-native';
import { EmptyState, Screen, colors } from '@prime/ui';

import { useAppSelector } from '@/store/hooks';
import { useGetInventoryQuery } from '@/store/api/endpoints';

export function OfficerInventoryScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data } = useGetInventoryQuery(user?.id ?? '', { skip: !user?.id });

  if (!data?.length) {
    return (
      <Screen>
        <EmptyState title="No equipment assigned" description="Assigned inventory will appear here" />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Text style={styles.row}>
            {item.name} · SKU {item.sku ?? '—'} · Qty {item.quantity}
          </Text>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.borderDefault },
});
