import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { EmptyState, ErrorState, ScreenWrapper, SkeletonLoader } from '@/components/common';
import { useOfficerAssignedTickets } from '@/hooks/officer';
import { SyncManager } from '@/services/offline/syncManager';
import {
  useUpdateOfficerTicketStatusMutation,
} from '@/services/api/officerPortalApi';
import { useUpdateRequestStatusMutation } from '@/store/api/endpoints';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import type { PortalTicketItem } from '@/types/portalTicket';
import type { OfficerStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import {
  getOfficerTicketAdvanceLabel,
  nextRequestStatusForOfficer,
  nextTicketStatusForOfficer,
} from '@/utils/officerTicketActions';
import {
  matchesOfficerTicketFilter,
  OFFICER_TICKET_FILTERS,
  officerTicketPriorityRank,
  type OfficerTicketFilterKey,
} from '@/utils/officerTicketFilters';
import { queryErrorMessage } from '@/utils/queryError';

import { OfficerTicketCard } from './requests/components/OfficerRequestCard';

export function OfficerRequestsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OfficerStackParamList>>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [filter, setFilter] = useState<OfficerTicketFilterKey>('all');
  const { items, isLoading, isError, error, refetch } = useOfficerAssignedTickets(user?.id);
  const [updateRequestStatus] = useUpdateRequestStatusMutation();
  const [updateTicketStatus] = useUpdateOfficerTicketStatusMutation();

  const sorted = useMemo(() => {
    return [...items]
      .filter((item) => matchesOfficerTicketFilter(item, filter))
      .sort((a, b) => officerTicketPriorityRank(a) - officerTicketPriorityRank(b));
  }, [filter, items]);

  const handlePress = useCallback(
    (itemId: string, kind: PortalTicketItem['kind']) => {
      navigation.navigate('RequestDetail', { requestId: itemId, kind });
    },
    [navigation],
  );

  const handleAdvance = useCallback(
    async (item: PortalTicketItem) => {
      if (!user) return;

      if (item.kind === 'ticket' && item.ticket) {
        const next = nextTicketStatusForOfficer(item.ticket.status);
        if (!next) return;
        try {
          await updateTicketStatus({
            ticketId: item.ticket.id,
            status: next,
            note: `Status updated to ${next}`,
            officerName: user.name,
          }).unwrap();
          refetch();
        } catch {
          dispatch(
            enqueueToast({
              id: `offline-ticket-${item.id}`,
              type: 'info',
              message: 'Could not update ticket — try again when online',
            }),
          );
        }
        return;
      }

      const currentStatus = String(item.request?.status ?? '').toLowerCase();
      const next = nextRequestStatusForOfficer(currentStatus);
      if (!next || !item.request) return;

      const payload = { id: item.request.id, status: next, note: `Status changed to ${next}` };
      try {
        await updateRequestStatus(payload).unwrap();
        refetch();
      } catch {
        await SyncManager.enqueue({
          id: `${item.id}-${next}-${Date.now()}`,
          operation: 'updateRequestStatus',
          endpoint: 'updateRequestStatus',
          payload,
        });
        dispatch(
          enqueueToast({
            id: `offline-${item.id}`,
            type: 'info',
            message: 'Saved offline — will sync when connected',
          }),
        );
      }
    },
    [dispatch, refetch, updateRequestStatus, updateTicketStatus, user],
  );

  const keyExtractor = useCallback((item: PortalTicketItem) => `${item.kind}-${item.id}`, []);

  const renderItem = useCallback(
    ({ item }: { item: PortalTicketItem }) => (
      <OfficerTicketCard
        item={item}
        advanceLabel={getOfficerTicketAdvanceLabel(item.statusBucket)}
        onPress={handlePress}
        onAdvance={handleAdvance}
      />
    ),
    [handleAdvance, handlePress],
  );

  const listHeader = (
    <View style={styles.filters}>
      {OFFICER_TICKET_FILTERS.map((f) => (
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
        <EmptyState title="No tickets" subtitle="Nothing in this filter" />
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
