import { useCallback } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import type { InventoryItem } from '@prime/types';
import { Screen } from '@prime/ui';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { useAppSelector } from '@/store/hooks';
import { useGetInventoryQuery } from '@/store/api/endpoints';
import { queryErrorMessage } from '@/utils/queryError';

import { InventoryItemRow } from './components/InventoryItemRow';

export function OfficerInventoryScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data, isLoading, isError, error, refetch } = useGetInventoryQuery(user?.id ?? '', { skip: !user?.id });

  const keyExtractor = useCallback((item: InventoryItem) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: InventoryItem }) => <InventoryItemRow item={item} />,
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
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
});
