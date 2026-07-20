import { spacing } from '@/theme/spacing';
import { useCallback } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import type { InventoryItem } from '@prime/types';
import { useOfficerPullToRefresh } from '@/hooks/officer/useOfficerPullToRefresh';
import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { OfficerScreen } from '@/components/officer';
import { useAppSelector } from '@/store/hooks';
import { useGetInventoryQuery } from '@/store/api/endpoints';
import { queryErrorMessage } from '@/utils/queryError';

import { InventoryItemRow } from './components/InventoryItemRow';

export function OfficerInventoryScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data, isLoading, isError, error, refetch } = useGetInventoryQuery(user?.id ?? '', { skip: !user?.id });
  const { refreshControl } = useOfficerPullToRefresh(refetch);

  const keyExtractor = useCallback((item: InventoryItem) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: InventoryItem }) => <InventoryItemRow item={item} />,
    [],
  );

  if (isLoading) {
    return (
      <OfficerScreen onRefresh={refetch}>
        <SkeletonLoader rows={6} showAvatar />
      </OfficerScreen>
    );
  }

  if (isError) {
    return (
      <OfficerScreen onRefresh={refetch}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </OfficerScreen>
    );
  }

  if (!data?.length) {
    return (
      <OfficerScreen onRefresh={refetch}>
        <EmptyState title="No items assigned" subtitle="Contact admin for equipment" icon="📦" />
      </OfficerScreen>
    );
  }

  return (
    <OfficerScreen scrollable={false} padded={false}>
      <FlatList
        refreshControl={refreshControl}
        data={data}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
      />
    </OfficerScreen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md }});
