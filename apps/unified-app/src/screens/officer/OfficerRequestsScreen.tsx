import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {DismissKeyboardFlatList, EmptyState, ErrorState, SkeletonLoader} from '@/components/common';
import { OfficerScreenWrapper } from '@/components/officer';
import { useOfficerAssignedTickets } from '@/hooks/officer';
import { useOfficerPullToRefresh } from '@/hooks/officer/useOfficerPullToRefresh';
import { SyncManager } from '@/services/offline/syncManager';
import { useUpdateOfficerTicketStatusMutation, useClaimOfficerTicketMutation } from '@/services/api/officerPortalApi';
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
  applyOfficerTicketListFilters,
  OFFICER_TICKET_DATE_FILTERS,
  OFFICER_TICKET_FILTERS,
  OFFICER_TICKET_SORT_OPTIONS,
  type OfficerTicketDateFilterKey,
  type OfficerTicketFilterKey,
  type OfficerTicketSortKey,
} from '@/utils/officerTicketFilters';
import { queryErrorMessage } from '@/utils/queryError';

import { OfficerTicketCard } from './requests/components/OfficerRequestCard';

type TicketPoolTab = 'mine' | 'open_pool';

const POOL_TABS: Array<{ key: TicketPoolTab; label: string }> = [
  { key: 'mine', label: 'Self' },
  { key: 'open_pool', label: 'Open pool' },
];

function isOpenPoolTicket(item: PortalTicketItem): boolean {
  return item.kind === 'ticket' && !item.assignedOfficerId;
}

function FilterChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ key: T; label: string }>;
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        keyboardShouldPersistTaps="handled"
      >
        {options.map((option) => {
          const active = option.key === value;
          return (
            <Pressable
              key={option.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(option.key)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function OfficerRequestsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OfficerStackParamList>>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [statusFilter, setStatusFilter] = useState<OfficerTicketFilterKey>('all');
  const [dateFilter, setDateFilter] = useState<OfficerTicketDateFilterKey>('all');
  const [sortBy, setSortBy] = useState<OfficerTicketSortKey>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [poolTab, setPoolTab] = useState<TicketPoolTab>('mine');
  const { items, isLoading, isError, error, refetch } = useOfficerAssignedTickets(user?.id);
  const { refreshControl } = useOfficerPullToRefresh(refetch);
  const [updateRequestStatus] = useUpdateRequestStatusMutation();
  const [updateTicketStatus] = useUpdateOfficerTicketStatusMutation();
  const [claimTicket, { isLoading: claiming }] = useClaimOfficerTicketMutation();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const mineCount = useMemo(
    () => items.filter((item) => !isOpenPoolTicket(item)).length,
    [items],
  );
  const openPoolCount = useMemo(
    () => items.filter((item) => isOpenPoolTicket(item)).length,
    [items],
  );

  const poolItems = useMemo(
    () =>
      items.filter((item) =>
        poolTab === 'open_pool' ? isOpenPoolTicket(item) : !isOpenPoolTicket(item),
      ),
    [items, poolTab],
  );

  const filtered = useMemo(
    () =>
      applyOfficerTicketListFilters(poolItems, {
        statusFilter,
        dateFilter,
        sortBy,
        searchQuery,
      }),
    [dateFilter, poolItems, searchQuery, sortBy, statusFilter],
  );

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

  const handleClaim = useCallback(
    async (item: PortalTicketItem) => {
      if (item.kind !== 'ticket') return;
      try {
        await claimTicket(item.id).unwrap();
        dispatch(
          enqueueToast({
            id: `claim-ticket-${item.id}`,
            type: 'success',
            message: 'Ticket assigned to you',
          }),
        );
        setPoolTab('mine');
        void refetch();
      } catch (err) {
        dispatch(
          enqueueToast({
            id: `claim-ticket-err-${item.id}`,
            type: 'error',
            message: queryErrorMessage(err, 'Could not pick up ticket'),
          }),
        );
      }
    },
    [claimTicket, dispatch, refetch],
  );

  const keyExtractor = useCallback((item: PortalTicketItem) => `${item.kind}-${item.id}`, []);

  const renderItem = useCallback(
    ({ item }: { item: PortalTicketItem }) => {
      const openPool = isOpenPoolTicket(item);
      return (
        <OfficerTicketCard
          item={item}
          advanceLabel={openPool ? undefined : getOfficerTicketAdvanceLabel(item.statusBucket)}
          claimLabel={openPool ? 'Pick up' : undefined}
          claiming={claiming}
          onPress={handlePress}
          onAdvance={openPool ? undefined : handleAdvance}
          onClaim={openPool ? handleClaim : undefined}
          onLocationSaved={() => void refetch()}
        />
      );
    },
    [claiming, handleAdvance, handleClaim, handlePress, refetch],
  );

  const listHeader = (
    <View style={styles.header}>
      <View style={styles.tabRow}>
        {POOL_TABS.map((tab) => {
          const active = poolTab === tab.key;
          const count = tab.key === 'mine' ? mineCount : openPoolCount;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tabChip, active && styles.tabChipActive]}
              onPress={() => setPoolTab(tab.key)}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label} ({count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder={
          poolTab === 'open_pool'
            ? 'Search open pool…'
            : 'Search tickets, customers…'
        }
        placeholderTextColor={colors.textSecondary}
        value={searchQuery}
        onChangeText={setSearchQuery}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      <FilterChipRow
        label="Status"
        options={OFFICER_TICKET_FILTERS}
        value={statusFilter}
        onChange={setStatusFilter}
      />
      <FilterChipRow
        label="Date"
        options={OFFICER_TICKET_DATE_FILTERS}
        value={dateFilter}
        onChange={setDateFilter}
      />
      <FilterChipRow
        label="Sort"
        options={OFFICER_TICKET_SORT_OPTIONS}
        value={sortBy}
        onChange={setSortBy}
      />

      <Text style={styles.resultCount}>
        {filtered.length} ticket{filtered.length === 1 ? '' : 's'}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <OfficerScreenWrapper scrollable={false}>
        <SkeletonLoader rows={6} showAvatar />
      </OfficerScreenWrapper>
    );
  }

  if (isError) {
    return (
      <OfficerScreenWrapper scrollable={false}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </OfficerScreenWrapper>
    );
  }

  return (
    <OfficerScreenWrapper scrollable={false} padded={false}>
      <DismissKeyboardFlatList
        refreshControl={refreshControl}
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState
            title={poolTab === 'open_pool' ? 'No open-pool tickets' : 'No tickets'}
            subtitle={
              searchQuery.trim()
                ? 'No matches for your search or filters'
                : poolTab === 'open_pool'
                  ? 'Unassigned open tickets will appear here for pickup'
                  : 'Nothing in this filter'
            }
          />
        }
      />
    </OfficerScreenWrapper>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tabChip: {
    flex: 1,
    minHeight: 40,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabChipActive: {
    borderColor: colors.primaryNavy,
    backgroundColor: colors.primaryNavy,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: colors.white,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceWhite,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 44,
    fontSize: 14,
    color: colors.textPrimary,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 32,
  },
  filterLabel: {
    width: 44,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingRight: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceWhite,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    minHeight: 28,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.primaryNavy,
    borderColor: colors.primaryNavy,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.white,
  },
  resultCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    marginBottom: spacing.xxs,
  },
});
