import { AdminScreenLayout } from '@/components/admin';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { PaymentCard, PaymentFilterBar, type PaymentFilterState } from '@/components/payments';
import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { scrollLayoutStyles } from '@/components/common/scrollLayoutStyles';
import { useCollectionAssignmentsSync } from '@/hooks/admin/useCollectionAssignmentsSync';
import { usePayments } from '@/hooks/usePayments';
import type { AdminPaymentsStackParamList } from '@/types/navigation';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { adminDesign, adminInputStyle } from '@/theme/adminDesign';
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

  const { data, isLoading, isError, error, refetch, isFetching } = usePayments({
    status: filters.status,
    method: filters.method,
    channel: filters.channel,
    search: filters.search,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  });

  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const showInitialLoading = isLoading && !data;

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

  const listHeader = useMemo(
    () => (
      <View style={adminScreenStyles.listHeader}>
        <PaymentsOverviewSection
          filters={filters}
          pendingSum={data?.pendingSum}
          onFilterPendingReview={onFilterPendingReview}
        />
        <View style={styles.transactionsHeader}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          <Text style={styles.subtitle}>
            Review collections, confirm cash, and track online payments
          </Text>
          <TextInput
            style={styles.search}
            placeholder="Search payment no., customer, account…"
            value={filters.search}
            onChangeText={(search) => setFilters((f) => ({ ...f, search }))}
            placeholderTextColor={adminDesign.colors.textMuted}
          />
          <PaymentFilterBar value={filters} onChange={setFilters} />
        </View>
        {isError ? (
          <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
        ) : null}
      </View>
    ),
    [data?.pendingSum, error, filters, isError, onFilterPendingReview, refetch],
  );

  const listEmpty = useMemo(() => {
    if (showInitialLoading) {
      return <SkeletonLoader rows={6} />;
    }
    if (isError) {
      return null;
    }
    return (
      <EmptyState
        title="No payments yet"
        subtitle="Payments from customers and officers will appear here once collected."
      />
    );
  }, [isError, showInitialLoading]);

  return (
    <AdminScreenLayout padded={false}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        renderItem={({ item }) => (
          <PaymentCard payment={item} onPress={() => onOpen(item.id, item.status)} />
        )}
        contentContainerStyle={adminScreenStyles.listContent}
        style={[scrollLayoutStyles.scrollContainer, styles.list]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        refreshing={isFetching && !isLoading}
        onRefresh={refetch}
      />
    </AdminScreenLayout>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  transactionsHeader: {
    gap: spacing.sm,
  },
  sectionTitle: adminDesign.typography.sectionTitle,
  subtitle: adminDesign.typography.meta,
  search: {
    ...adminInputStyle,
    fontSize: adminDesign.input.fontSize,
    color: colors.textPrimary,
  },
});
