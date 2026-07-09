import { memo, useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AmountDisplay, PaymentStatusBadge } from '@/components/payments';
import { EmptyState, ErrorState, DismissKeyboardFlatList, ScreenWrapper, SkeletonLoader } from '@/components/common';
import { useOfficerId } from '@/hooks/useOfficerId';
import { useGetPaymentsQuery } from '@/services/api/paymentCollectionApi';
import type { PaymentMethod, PaymentRecord, PaymentStatus } from '@/types/payments';
import { PAYMENT_METHOD_CONFIG } from '@/types/payments';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { formatINR } from '@/utils/currencyFormat';
import { applyCollectionHistoryFilters } from '@/utils/officerCollectionHistory';
import { hasPaymentText, paymentText } from '@/utils/paymentText';
import { queryErrorMessage } from '@/utils/queryError';

type Props = { embedded?: boolean };

type StatusFilter = 'all' | 'pending' | PaymentStatus;
type MethodFilter = 'all' | PaymentMethod;
type SortKey = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc';
type HistoryViewMode = 'list' | 'card';

const STATUS_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const METHOD_CHIPS: { value: MethodFilter; label: string }[] = [
  { value: 'all', label: 'All methods' },
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'netbanking', label: 'Netbanking' },
];

const SORT_CHIPS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'amount_desc', label: 'Amount ↓' },
  { value: 'amount_asc', label: 'Amount ↑' },
];

function PaymentMeta({ item, compact }: { item: PaymentRecord; compact?: boolean }) {
  const collectionRef =
    paymentText(item.gateway_payment_id) ?? paymentText(item.receipt_number);
  const notes = paymentText(item.cash_collection_notes);
  const evidenceUrl = paymentText(item.evidence_photo_url);
  const hasMeta =
    hasPaymentText(collectionRef) || hasPaymentText(notes) || hasPaymentText(evidenceUrl);

  if (!hasMeta) return null;

  if (compact) {
    return (
      <View style={styles.metaInline}>
        {hasPaymentText(collectionRef) ? (
          <Text style={styles.metaInlineText} numberOfLines={1}>
            Ref: {collectionRef}
          </Text>
        ) : null}
        {hasPaymentText(evidenceUrl) ? (
          <Pressable onPress={() => void Linking.openURL(evidenceUrl!)} hitSlop={8}>
            <Text style={styles.metaLinkCompact}>Photo</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.metaBlock}>
      {hasPaymentText(collectionRef) ? (
        <Text style={styles.metaLine}>Reference: {collectionRef}</Text>
      ) : null}
      {hasPaymentText(notes) ? <Text style={styles.metaLine}>Notes: {notes}</Text> : null}
      {hasPaymentText(evidenceUrl) ? (
        <Pressable onPress={() => void Linking.openURL(evidenceUrl!)}>
          <Text style={styles.metaLink}>View evidence photo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function HistoryViewToggle({
  value,
  onChange,
}: {
  value: HistoryViewMode;
  onChange: (next: HistoryViewMode) => void;
}) {
  return (
    <View style={styles.viewToggle}>
      <Pressable
        style={[styles.toggleBtn, value === 'list' && styles.toggleActive]}
        onPress={() => onChange('list')}
        accessibilityRole="button"
        accessibilityLabel="List view"
        accessibilityState={{ selected: value === 'list' }}
      >
        <Ionicons
          name="list-outline"
          size={16}
          color={value === 'list' ? colors.white : colors.textSecondary}
        />
      </Pressable>
      <Pressable
        style={[styles.toggleBtn, value === 'card' && styles.toggleActive]}
        onPress={() => onChange('card')}
        accessibilityRole="button"
        accessibilityLabel="Card view"
        accessibilityState={{ selected: value === 'card' }}
      >
        <Ionicons
          name="grid-outline"
          size={16}
          color={value === 'card' ? colors.white : colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const CollectionHistoryListRow = memo(function CollectionHistoryListRow({
  item,
}: {
  item: PaymentRecord;
}) {
  const methodLabel = PAYMENT_METHOD_CONFIG[item.method]?.label ?? item.method;
  const isPending = item.status === 'pending_review' || item.status === 'cash_collected';

  return (
    <View style={styles.listRow}>
      <View style={styles.listTop}>
        <Text style={styles.listNumber} numberOfLines={1}>
          {item.payment_number || item.id.slice(0, 8)}
        </Text>
        <PaymentStatusBadge status={item.status} />
      </View>
      <View style={styles.listMiddle}>
        <Text style={styles.listCustomer} numberOfLines={1}>
          {item.customer_name} · {methodLabel}
        </Text>
        <Text style={styles.listAmount}>{formatINR(item.total_amount)}</Text>
      </View>
      <View style={styles.listBottom}>
        <Text style={styles.listDate}>
          {new Date(item.created_at).toLocaleString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        {isPending ? <Text style={styles.listPending}>Pending review</Text> : null}
      </View>
      <PaymentMeta item={item} compact />
    </View>
  );
});

const CollectionHistoryCard = memo(function CollectionHistoryCard({ item }: { item: PaymentRecord }) {
  const isPending = item.status === 'pending_review' || item.status === 'cash_collected';

  return (
    <View style={styles.cardRow}>
      <View style={styles.cardTop}>
        <Text style={styles.number}>{item.payment_number || item.id.slice(0, 8)}</Text>
        <PaymentStatusBadge status={item.status} />
      </View>
      <Text style={styles.customer}>{item.customer_name}</Text>
      <AmountDisplay amount={item.total_amount} />
      <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
      <PaymentMeta item={item} />
      {isPending ? <Text style={styles.pendingHint}>Awaiting admin verification</Text> : null}
      {item.status === 'confirmed' ? (
        <Text style={styles.pendingHint}>Confirmed — invoice can be generated from admin Payments</Text>
      ) : null}
    </View>
  );
});

function FilterChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[styles.chip, active ? styles.chipActive : null]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.chipLabel, active ? styles.chipLabelActive : null]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function OfficerCollectionHistoryScreen({ embedded }: Props) {
  const officerId = useOfficerId();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<HistoryViewMode>('list');

  const baseFilters = useMemo(
    () => ({
      officer_id: officerId ?? 'all',
      channel: 'officer_cash' as const,
      pageSize: 100,
      sortBy: 'created_at' as const,
      sortOrder: 'desc' as const,
      skipAggregates: true,
      lite: true,
    }),
    [officerId],
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useGetPaymentsQuery(baseFilters, {
    skip: !officerId,
  });

  const rows = useMemo(
    () =>
      applyCollectionHistoryFilters(data?.rows ?? [], {
        statusFilter,
        methodFilter,
        search,
        sortKey,
      }),
    [data?.rows, methodFilter, search, sortKey, statusFilter],
  );

  const summaryLine = useMemo(() => {
    const total = rows.reduce((sum, row) => sum + row.total_amount, 0);
    return `${rows.length} collections · ${formatINR(total)}`;
  }, [rows]);

  const renderItem = useCallback(
    ({ item }: { item: PaymentRecord }) =>
      viewMode === 'list' ? (
        <CollectionHistoryListRow item={item} />
      ) : (
        <CollectionHistoryCard item={item} />
      ),
    [viewMode],
  );

  const showInitialLoader = isLoading && !data;

  if (!officerId) {
    return embedded ? (
      <ErrorState message="Officer profile not found." />
    ) : (
      <ScreenWrapper scrollable={false}>
        <ErrorState message="Officer profile not found." />
      </ScreenWrapper>
    );
  }

  if (showInitialLoader) {
    return embedded ? (
      <SkeletonLoader rows={5} />
    ) : (
      <ScreenWrapper scrollable={false}>
        <SkeletonLoader rows={5} />
      </ScreenWrapper>
    );
  }

  if (isError) {
    return embedded ? (
      <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
    ) : (
      <ScreenWrapper scrollable={false}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </ScreenWrapper>
    );
  }

  const filters = (
    <View style={styles.filters}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search payment #, customer, account…"
        placeholderTextColor={colors.textSecondary}
        value={search}
        onChangeText={setSearch}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={styles.filterLabel}>STATUS</Text>
      <FilterChipRow options={STATUS_CHIPS} value={statusFilter} onChange={setStatusFilter} />
      <Text style={styles.filterLabel}>METHOD</Text>
      <FilterChipRow options={METHOD_CHIPS} value={methodFilter} onChange={setMethodFilter} />
      <Text style={styles.filterLabel}>SORT</Text>
      <FilterChipRow options={SORT_CHIPS} value={sortKey} onChange={setSortKey} />
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLine}>
          {summaryLine}
          {isFetching ? ' · Updating…' : ''}
        </Text>
        <HistoryViewToggle value={viewMode} onChange={setViewMode} />
      </View>
    </View>
  );

  const list = (
    <DismissKeyboardFlatList
      data={rows}
      keyExtractor={(item) => item.id}
      extraData={viewMode}
      ListHeaderComponent={embedded ? null : filters}
      ListEmptyComponent={
        <EmptyState
          title="No collections"
          subtitle={
            search.trim() || statusFilter !== 'all' || methodFilter !== 'all'
              ? 'No payments match your filters. Try clearing search or filters.'
              : 'Payments you record will appear here while awaiting admin verification.'
          }
        />
      }
      renderItem={renderItem}
      contentContainerStyle={embedded ? styles.embeddedList : styles.list}
      keyboardShouldPersistTaps="handled"
    />
  );

  if (embedded) {
    return (
      <View style={styles.embeddedWrap}>
        {filters}
        {list}
      </View>
    );
  }

  return <ScreenWrapper scrollable={false}>{list}</ScreenWrapper>;
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.lg },
  embeddedWrap: { flex: 1 },
  embeddedList: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  filters: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  chipActive: {
    borderColor: colors.primaryNavy,
    backgroundColor: colors.background,
  },
  chipLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipLabelActive: { color: colors.primaryNavy },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  summaryLine: { flex: 1, fontSize: 12, color: colors.textSecondary },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
    backgroundColor: colors.surfaceWhite,
  },
  toggleBtn: {
    minWidth: 40,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  toggleActive: { backgroundColor: colors.primaryNavy },
  listRow: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xxs,
  },
  listTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  listNumber: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  listMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  listCustomer: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  listAmount: { fontSize: 14, fontWeight: '700', color: colors.primaryNavy },
  listBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  listDate: { fontSize: 11, color: colors.textSecondary },
  listPending: { fontSize: 11, fontWeight: '600', color: colors.amber },
  metaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  metaInlineText: { flex: 1, fontSize: 11, color: colors.textSecondary },
  metaLinkCompact: { fontSize: 11, fontWeight: '600', color: colors.primaryNavy },
  cardRow: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xs,
  },
  number: { fontFamily: 'monospace', fontWeight: '700', color: colors.textPrimary },
  customer: { color: colors.textSecondary },
  date: { fontSize: 11, color: colors.textSecondary },
  metaBlock: { marginTop: spacing.xs, gap: spacing.xxs },
  metaLine: { fontSize: 12, color: colors.textSecondary },
  metaLink: { fontSize: 12, fontWeight: '600', color: colors.primaryNavy },
  pendingHint: { fontSize: 11, color: colors.amber, marginTop: spacing.xxs },
});
