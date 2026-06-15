import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@prime/ui';

import { AmountDisplay, PaymentStatusBadge } from '@/components/payments';
import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { useOfficerId } from '@/hooks/useOfficerId';
import { useGetPaymentsQuery } from '@/services/api/paymentCollectionApi';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = { embedded?: boolean };

export function OfficerCollectionHistoryScreen({ embedded }: Props) {
  const officerId = useOfficerId();
  const { data, isLoading, isError, error, refetch } = useGetPaymentsQuery({
    officer_id: officerId ?? 'all',
    channel: 'officer_cash',
    pageSize: 50,
  });

  if (!officerId) {
    return embedded ? <ErrorState message="Officer profile not found." /> : (
      <Screen><ErrorState message="Officer profile not found." /></Screen>
    );
  }

  if (isLoading) {
    return embedded ? <SkeletonLoader rows={5} /> : <Screen><SkeletonLoader rows={5} /></Screen>;
  }
  if (isError) {
    return embedded ? (
      <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
    ) : (
      <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>
    );
  }

  const list = (
    <FlatList
      data={data?.rows ?? []}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<EmptyState title="No collections" subtitle="Your cash collections will appear here." />}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.number}>{item.payment_number}</Text>
          <Text style={styles.customer}>{item.customer_name}</Text>
          <AmountDisplay amount={item.total_amount} />
          <PaymentStatusBadge status={item.status} />
          <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
      )}
      contentContainerStyle={embedded ? styles.embeddedList : undefined}
    />
  );

  if (embedded) return list;

  return (
    <Screen style={styles.screen}>
      {list}
    </Screen>
  );
}


const styles = StyleSheet.create({
  screen: { padding: spacing.md, backgroundColor: colors.background },
  row: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xs,
  },
  number: { fontFamily: 'monospace', fontWeight: '700', color: colors.textPrimary },
  customer: { color: colors.textSecondary },
  date: { fontSize: 11, color: colors.textSecondary },
  embeddedList: { padding: spacing.md },
});
