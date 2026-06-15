import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ServiceRequest } from '@prime/types';

import { EmptyState, ErrorState, ScreenWrapper, SkeletonLoader } from '@/components/common';
import { SyncManager } from '@/services/offline/syncManager';
import { useAppDispatch } from '@/store/hooks';
import { useAppSelector } from '@/store/hooks';
import { useGetAssignedRequestsQuery, useUpdateRequestStatusMutation } from '@/store/api/endpoints';
import { enqueueToast } from '@/store/slices/uiSlice';
import type { OfficerStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

import { OfficerRequestCard } from './requests/components/OfficerRequestCard';

type FilterKey = 'all' | 'new' | 'active' | 'done';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'active', label: 'Active' },
  { key: 'done', label: 'Done' },
];

const PRIORITY_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

const STATUS_FLOW: Record<string, string | null> = {
  pending: 'in_transit',
  assigned: 'in_transit',
  in_transit: 'on_site',
  on_site: 'working',
  working: 'resolved',
};

function advanceLabel(status: string): string | undefined {
  switch (status) {
    case 'pending':
    case 'assigned':
      return 'Accept';
    case 'in_transit':
      return 'Arrived';
    case 'on_site':
    case 'working':
      return 'Mark resolved';
    default:
      return undefined;
  }
}

function matchesFilter(status: string, filter: FilterKey): boolean {
  if (filter === 'all') return true;
  if (filter === 'new') return status === 'pending' || status === 'assigned';
  if (filter === 'active') return ['in_transit', 'on_site', 'working', 'accepted'].includes(status);
  if (filter === 'done') return status === 'resolved' || status === 'closed';
  return true;
}

export function OfficerRequestsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OfficerStackParamList>>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [filter, setFilter] = useState<FilterKey>('all');
  const { data: requests, isLoading, isError, error, refetch } = useGetAssignedRequestsQuery(user?.id, {
    skip: !user?.id,
  });
  const [updateStatus] = useUpdateRequestStatusMutation();

  const sorted = useMemo(() => {
    return [...(requests ?? [])]
      .filter((r) => matchesFilter(r.status, filter))
      .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));
  }, [filter, requests]);

  const handlePress = useCallback(
    (requestId: string) => navigation.navigate('RequestDetail', { requestId }),
    [navigation],
  );

  const handleAdvance = useCallback(
    async (id: string, currentStatus: string) => {
      const next = STATUS_FLOW[currentStatus];
      if (!next) return;
      const payload = { id, status: next, note: `Status changed to ${next}` };
      try {
        await updateStatus(payload).unwrap();
      } catch {
        await SyncManager.enqueue({
          id: `${id}-${next}-${Date.now()}`,
          operation: 'updateRequestStatus',
          endpoint: 'updateRequestStatus',
          payload,
        });
        dispatch(
          enqueueToast({
            id: `offline-${id}`,
            type: 'info',
            message: 'Saved offline — will sync when connected',
          }),
        );
      }
      refetch();
    },
    [dispatch, refetch, updateStatus],
  );

  const keyExtractor = useCallback((item: ServiceRequest) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: ServiceRequest }) => (
      <OfficerRequestCard
        request={item}
        advanceLabel={advanceLabel(item.status)}
        onPress={handlePress}
        onAdvance={handleAdvance}
      />
    ),
    [handleAdvance, handlePress],
  );

  const listHeader = (
    <View style={styles.filters}>
      {FILTERS.map((f) => (
        <Pressable
          key={f.key}
          style={[styles.chip, filter === f.key && styles.chipActive]}
          onPress={() => setFilter(f.key)}
        >
          <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
        </Pressable>
      ))}
    </View>
  );

  if (isLoading) {
    return (
      <ScreenWrapper scrollable={false}>
        <SkeletonLoader rows={6} showAvatar />
      </ScreenWrapper>
    );
  }

  if (isError) {
    return (
      <ScreenWrapper scrollable={false}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </ScreenWrapper>
    );
  }

  if (!sorted.length) {
    return (
      <ScreenWrapper scrollable={false}>
        {listHeader}
        <EmptyState title="No requests" subtitle="Nothing in this filter" icon="✅" />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <FlatList
        data={sorted}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.xxl },
  filters: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceWhite,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primaryNavy, borderColor: colors.primaryNavy },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.white },
});
