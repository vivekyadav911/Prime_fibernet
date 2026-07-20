import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '@prime/ui';
import { useOfficerPullToRefresh } from '@/hooks/officer/useOfficerPullToRefresh';
import { AmountDisplay, CollectionStatusBadge } from '@/components/payments';
import {EmptyState, ErrorState, DismissKeyboardFlatList, SkeletonLoader} from '@/components/common';
import { OfficerScreenWrapper } from '@/components/officer';
import { useClaimCollection } from '@/hooks/officer/useClaimCollection';
import { useOfficerCollections } from '@/hooks/usePayments';
import { formatINR } from '@/utils/currencyFormat';
import type { OfficerCollectionsStackParamList } from '@/types/navigation';
import type { OfficerAssignedCustomer } from '@/types/payments';
import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type CollectionTab = 'assigned' | 'open_pool';

type Props = NativeStackScreenProps<OfficerCollectionsStackParamList, 'CollectionsList'>;

const TAB_OPTIONS: { value: CollectionTab; label: string }[] = [
  { value: 'assigned', label: 'Assigned to me' },
  { value: 'open_pool', label: 'Open pool' },
];

function filterCustomers(
  customers: OfficerAssignedCustomer[],
  query: string,
): OfficerAssignedCustomer[] {
  const q = query.trim().toLowerCase();
  if (!q) return customers;
  return customers.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.customer_id.toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q),
  );
}

export function OfficerCollectionScreen({ route }: Props) {
  const navigation =
    useNavigation<NativeStackNavigationProp<OfficerCollectionsStackParamList>>();
  const initialTab = route.params?.initialTab ?? 'assigned';
  const [tab, setTab] = useState<CollectionTab>(initialTab);
  const [query, setQuery] = useState('');
  const { data, isLoading, isError, error, refetch } = useOfficerCollections();
  const { refreshControl } = useOfficerPullToRefresh(refetch);
  const { claim, isLoading: claiming } = useClaimCollection();

  useEffect(() => {
    if (route.params?.initialTab) {
      setTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  const myWork = data?.myWork ?? [];
  const openPool = data?.openPool ?? [];

  const activeList = tab === 'assigned' ? myWork : openPool;
  const filteredList = useMemo(
    () => filterCustomers(activeList, query),
    [activeList, query],
  );

  const outstandingTotal = useMemo(
    () => filteredList.reduce((sum, c) => sum + c.outstanding_amount, 0),
    [filteredList],
  );

  const onCollect = useCallback(
    (customer: OfficerAssignedCustomer) => {
      navigation.navigate('CashCollection', {
        customerId: customer.id,
        customerName: customer.name,
        accountNumber: customer.customer_id,
        amount: customer.outstanding_amount,
        dueDate: customer.next_due_date ?? undefined,
      });
    },
    [navigation],
  );

  const onViewHistory = useCallback(
    (customer: OfficerAssignedCustomer) => {
      navigation.navigate('CustomerPaymentHistory', {
        customerId: customer.id,
        customerName: customer.name,
      });
    },
    [navigation],
  );

  const onClaim = useCallback(
    async (customer: OfficerAssignedCustomer) => {
      try {
        const result = await claim(customer.id).unwrap();
        Alert.alert('Assigned', `${customer.name} is now under Assigned to me.`);
        await refetch();
        setTab('assigned');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Try again.';
        Alert.alert('Cannot claim', msg);
      }
    },
    [claim, refetch],
  );

  const renderItem = useCallback(
    ({ item }: { item: OfficerAssignedCustomer }) => (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.name}>
            {item.name} · {item.customer_id}
          </Text>
          <CollectionStatusBadge status={item.collectionStatus ?? item.assignmentType} />
        </View>
        {item.phone ? <Text style={styles.meta}>{item.phone}</Text> : null}
        <AmountDisplay amount={item.outstanding_amount} />
        {item.next_due_date ? <Text style={styles.due}>Due: {item.next_due_date}</Text> : null}
        <View style={styles.row}>
          <Button label="History" variant="secondary" onPress={() => onViewHistory(item)} />
          {tab === 'open_pool' ? (
            <Button label="Assign to me" onPress={() => void onClaim(item)} disabled={claiming} />
          ) : (
            <Button label="Collect →" onPress={() => onCollect(item)} />
          )}
        </View>
      </View>
    ),
    [claiming, onClaim, onCollect, onViewHistory, tab],
  );

  if (isLoading) {
    return (
      <OfficerScreenWrapper scrollable={false}>
        <SkeletonLoader rows={5} />
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
      <View style={styles.summaryBar}>
        <Text style={styles.summaryLine}>
          Collected today: {formatINR(data?.todayTotal ?? 0)} · Confirmed:{' '}
          {data?.confirmedToday ?? 0}
        </Text>
        <View style={styles.collectCta}>
          <Button
            label="Record payment"
            variant="secondary"
            onPress={() => navigation.navigate('RecordPayment')}
          />
          <Button
            label="View collection history"
            variant="secondary"
            onPress={() => navigation.navigate('CollectionHistory')}
          />
        </View>
      </View>

      <View style={styles.tabRow}>
        {TAB_OPTIONS.map((option) => {
          const count = option.value === 'assigned' ? myWork.length : openPool.length;
          const active = tab === option.value;
          return (
            <Pressable
              key={option.value}
              style={[styles.tabChip, active ? styles.tabChipActive : null]}
              onPress={() => setTab(option.value)}
            >
              <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>
                {option.label} ({count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.input}
          placeholder={tab === 'open_pool' ? 'Search open pool…' : 'Search assigned customers…'}
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.summaryLine}>
          {filteredList.length} customers · {formatINR(outstandingTotal)} outstanding
        </Text>
      </View>

      <DismissKeyboardFlatList
        refreshControl={refreshControl} 
        data={filteredList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState
            title={tab === 'assigned' ? 'No assigned work' : 'Open pool is empty'}
            subtitle={
              tab === 'assigned'
                ? 'Switch to Open pool to search and claim customers, or wait for admin assignment.'
                : query
                  ? 'No matches in the open pool. Try another search.'
                  : 'No customers in the open pool. Admin must release customers to the pool first.'
            }
          />
        }
        renderItem={renderItem}
      />
    </OfficerScreenWrapper>
  );
}

const styles = StyleSheet.create({
  summaryBar: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  summaryLine: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.xs },
  collectCta: { marginTop: spacing.sm, gap: spacing.sm },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  tabChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
    alignItems: 'center',
  },
  tabChipActive: {
    borderColor: colors.primaryNavy,
    backgroundColor: colors.background,
  },
  tabLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
  tabLabelActive: { color: colors.primaryNavy },
  searchWrap: { paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  input: {
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
  list: { padding: spacing.md, paddingTop: 0 },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xs,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: { fontWeight: '600', color: colors.textPrimary, flex: 1 },
  meta: { fontSize: 13, color: colors.textSecondary },
  due: { fontSize: 12, color: colors.amber },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
