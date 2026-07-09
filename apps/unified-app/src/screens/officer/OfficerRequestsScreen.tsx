import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { DismissKeyboardFlatList, EmptyState, ErrorState, ScreenWrapper, SkeletonLoader } from '@/components/common';
import { useOfficerAssignedTickets } from '@/hooks/officer';
import { SyncManager } from '@/services/offline/syncManager';
import { useUpdateOfficerTicketStatusMutation } from '@/services/api/officerPortalApi';
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

function FilterChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ key: T; label: string }>;
  value: T;
  onChange: (key: T) => void;
}) {
  return (
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
  const { items, isLoading, isError, error, refetch } = useOfficerAssignedTickets(user?.id);
  const [updateRequestStatus] = useUpdateRequestStatusMutation();
  const [updateTicketStatus] = useUpdateOfficerTicketStatusMutation();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const filtered = useMemo(
    () =>
      applyOfficerTicketListFilters(items, {
        statusFilter,
        dateFilter,
        sortBy,
        searchQuery,
      }),
    [dateFilter, items, searchQuery, sortBy, statusFilter],
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

  const keyExtractor = useCallback((item: PortalTicketItem) => `${item.kind}-${item.id}`, []);

  const renderItem = useCallback(
    ({ item }: { item: PortalTicketItem }) => (
      <OfficerTicketCard
        item={item}
        advanceLabel={getOfficerTicketAdvanceLabel(item.statusBucket)}
        onPress={handlePress}
        onAdvance={handleAdvance}
        onLocationSaved={() => void refetch()}
      />
    ),
    [handleAdvance, handlePress, refetch],
  );

  const listHeader = (
    <View style={styles.header}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search tickets, customers, addresses…"
        placeholderTextColor={colors.textSecondary}
        value={searchQuery}
        onChangeText={setSearchQuery}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      <Text style={styles.sectionLabel}>STATUS</Text>
      <FilterChipRow options={OFFICER_TICKET_FILTERS} value={statusFilter} onChange={setStatusFilter} />
      <Text style={styles.sectionLabel}>DATE</Text>
      <FilterChipRow options={OFFICER_TICKET_DATE_FILTERS} value={dateFilter} onChange={setDateFilter} />
      <Text style={styles.sectionLabel}>SORT</Text>
      <FilterChipRow options={OFFICER_TICKET_SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
      <Text style={styles.resultCount}>
        {filtered.length} ticket{filtered.length === 1 ? '' : 's'}
      </Text>
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

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <DismissKeyboardFlatList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState
            title="No tickets"
            subtitle={
              searchQuery.trim()
                ? 'No matches for your search or filters'
                : 'Nothing in this filter'
            }
          />
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.xxl },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceWhite,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
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
  resultCount: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
});
