import { useCallback, useMemo } from 'react';
import { FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ServiceRequest } from '@prime/types';
import { Screen } from '@prime/ui';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { SyncManager } from '@/services/offline/syncManager';
import { useAppSelector } from '@/store/hooks';
import { useGetAssignedRequestsQuery, useUpdateRequestStatusMutation } from '@/store/api/endpoints';
import type { OfficerStackParamList } from '@/types/navigation';
import { queryErrorMessage } from '@/utils/queryError';

import { OfficerRequestCard } from './requests/components/OfficerRequestCard';

const STATUS_FLOW: Record<string, string | null> = {
  pending: 'working',
  assigned: 'working',
  working: 'resolved',
  in_transit: 'on_site',
  on_site: 'working',
};

function advanceLabel(status: string): string | undefined {
  if (!STATUS_FLOW[status]) return undefined;
  return status === 'working' ? 'Mark resolved' : 'Start work';
}

export function OfficerRequestsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OfficerStackParamList>>();
  const user = useAppSelector((s) => s.auth.user);
  const { data: requests, isLoading, isError, error, refetch } = useGetAssignedRequestsQuery(user?.id, {
    skip: !user?.id,
  });
  const [updateStatus] = useUpdateRequestStatusMutation();

  const sorted = useMemo(
    () => [...(requests ?? [])].sort((a, b) => a.priority.localeCompare(b.priority)),
    [requests],
  );

  const handlePress = useCallback(
    (requestId: string) => navigation.navigate('RequestDetail', { requestId }),
    [navigation],
  );

  const handleAdvance = useCallback(
    async (id: string, currentStatus: string) => {
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
    },
    [refetch, updateStatus],
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

  if (!sorted.length) {
    return (
      <Screen>
        <EmptyState title="No assigned requests" subtitle="You're all caught up" icon="✅" />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList data={sorted} keyExtractor={keyExtractor} renderItem={renderItem} />
    </Screen>
  );
}
