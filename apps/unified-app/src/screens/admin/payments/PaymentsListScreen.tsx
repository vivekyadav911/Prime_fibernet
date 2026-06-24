import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { PaymentCard, PaymentFilterBar, type PaymentFilterState } from '@/components/payments';
import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { useCollectionAssignmentsSync } from '@/hooks/admin/useCollectionAssignmentsSync';
import { usePayments } from '@/hooks/usePayments';
import type { AdminPaymentsStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

import { PaymentsOverviewSection } from './PaymentsOverviewSection';

export function PaymentsListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminPaymentsStackParamList>>();
  useCollectionAssignmentsSync();
  const [filters, setFilters] = useState<PaymentFilterState>({
    status: 'all',
    method: 'all',
    channel: 'all',
    search: '',
    dateFrom: '',
    dateTo: '',
  });

  const { data, isLoading, isError, error, refetch } = usePayments({
    status: filters.status,
    method: filters.method,
    channel: filters.channel,
    search: filters.search,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  });

  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);

  const onFilterPendingReview = useCallback(() => {
    setFilters((f) => ({ ...f, status: 'pending_review' }));
  }, []);

  const onOpen = useCallback(
    (paymentId: string, status: string) => {
      if (status === 'pending_review' || status === 'cash_collected') {
        navigation.navigate('PaymentReview', { paymentId });
      } else {
        navigation.navigate('PaymentDetail', { paymentId });
      }
    },
    [navigation],
  );

  const listHeader = (
    <>
      <PaymentsOverviewSection
        filters={filters}
        pendingSum={data?.pendingSum}
        onFilterPendingReview={onFilterPendingReview}
      />
      <Text style={styles.sectionTitle}>Transactions</Text>
      <Text style={styles.subtitle}>Review collections, confirm cash, and track online payments</Text>
      <TextInput
        style={styles.search}
        placeholder="Search payment no., customer, account…"
        value={filters.search}
        onChangeText={(search) => setFilters((f) => ({ ...f, search }))}
        placeholderTextColor={colors.textSecondary}
      />
      <PaymentFilterBar value={filters} onChange={setFilters} />
    </>
  );

  if (isLoading) {
    return (
      <Screen style={styles.screen}>
        {listHeader}
        <SkeletonLoader rows={6} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen style={styles.screen}>
        {listHeader}
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <EmptyState
            title="No payments yet"
            subtitle="Payments from customers and officers will appear here once collected."
          />
        }
        renderItem={({ item }) => (
          <PaymentCard payment={item} onPress={() => onOpen(item.id, item.status)} />
        )}
        contentContainerStyle={styles.listContent}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: adminColors.canvasBg, flex: 1 },
  listContent: { padding: spacing.md, paddingTop: 0 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md },
  search: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    color: colors.textPrimary,
  },
});
