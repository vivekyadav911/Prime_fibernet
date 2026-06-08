import { FlatList, StyleSheet, Text } from 'react-native';
import { Screen, colors } from '@prime/ui';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { useAppSelector } from '@/store/hooks';
import { useGetInventoryQuery } from '@/store/api/endpoints';
import { queryErrorMessage } from '@/utils/queryError';

export function OfficerInventoryScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data, isLoading, isError, error, refetch } = useGetInventoryQuery(user?.id ?? '', { skip: !user?.id });

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

  if (!data?.length) {
    return (
      <Screen>
        <EmptyState title="No items assigned" subtitle="Contact admin for equipment" icon="📦" />
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
