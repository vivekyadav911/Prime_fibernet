import { AdminScreenLayout } from '@/components/admin';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';


import { PaymentCard, PaymentFilterBar, type PaymentFilterState } from '@/components/payments';
import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
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
    <View style={adminScreenStyles.listHeader}>
      <PaymentsOverviewSection
        filters={filters}
        pendingSum={data?.pendingSum}
        onFilterPendingReview={onFilterPendingReview}
      />
      <View style={styles.transactionsHeader}>
        <Text style={styles.sectionTitle}>Transactions</Text>
        <Text style={styles.subtitle}>Review collections, confirm cash, and track online payments</Text>
        <TextInput
          style={styles.search}
          placeholder="Search payment no., customer, account…"
          value={filters.search}
          onChangeText={(search) => setFilters((f) => ({ ...f, search }))}
          placeholderTextColor={adminDesign.colors.textMuted}
        />
        <PaymentFilterBar value={filters} onChange={setFilters} />
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <AdminScreenLayout>
        <FlatList
          data={[]}
          keyExtractor={() => 'loading'}
          ListHeaderComponent={
            <>
              {listHeader}
              <SkeletonLoader rows={6} />
            </>
          }
          contentContainerStyle={adminScreenStyles.listContent}
          renderItem={() => null}
        />
      </AdminScreenLayout>
    );
  }

  if (isError) {
    return (
      <AdminScreenLayout>
        <FlatList
          data={[]}
          keyExtractor={() => 'error'}
          ListHeaderComponent={
            <>
              {listHeader}
              <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
            </>
          }
          contentContainerStyle={adminScreenStyles.listContent}
          renderItem={() => null}
        />
      </AdminScreenLayout>
    );
  }

  return (
    <AdminScreenLayout>
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
        contentContainerStyle={adminScreenStyles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </AdminScreenLayout>
  );
}

const styles = StyleSheet.create({
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
