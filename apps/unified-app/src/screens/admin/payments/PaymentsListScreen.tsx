import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import {
  ExportButton,
  PaymentCard,
  PaymentFilterBar,
  type PaymentFilterState,
} from '@/components/payments';
import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { usePayments } from '@/hooks/usePayments';
import { formatINR } from '@/utils/currencyFormat';
import type { AdminPaymentsStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

export function PaymentsListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminPaymentsStackParamList>>();
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

  const body = isLoading ? (
    <SkeletonLoader rows={6} />
  ) : isError ? (
    <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
  ) : (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<EmptyState title="No payments" message="No payments match your filters." />}
      renderItem={({ item }) => (
        <PaymentCard payment={item} onPress={() => onOpen(item.id, item.status)} />
      )}
    />
  );

  return (
    <Screen style={styles.screen}>
      <View style={styles.toolbar}>
        <Text style={styles.title}>Payments Collection</Text>
        <View style={styles.toolbarRight}>
          <Pressable onPress={() => navigation.navigate('PaymentAnalytics')}>
            <Text style={styles.link}>Analytics</Text>
          </Pressable>
          <ExportButton filters={filters} />
        </View>
      </View>
      <TextInput
        style={styles.search}
        placeholder="Search payment no., customer, account…"
        value={filters.search}
        onChangeText={(search) => setFilters((f) => ({ ...f, search }))}
        placeholderTextColor={colors.textSecondary}
      />
      <PaymentFilterBar value={filters} onChange={setFilters} />
      {data ? (
        <Text style={styles.summary}>
          Showing {data.total} payments · Collected: {formatINR(data.confirmedSum)} · Pending:{' '}
          {formatINR(data.pendingSum)}
        </Text>
      ) : null}
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: adminColors.canvasBg, padding: spacing.md },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  link: { fontSize: 13, fontWeight: '600', color: adminColors.primary },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  search: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    color: colors.textPrimary,
  },
  summary: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.sm },
});
