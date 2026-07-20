import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOfficerPullToRefresh } from '@/hooks/officer/useOfficerPullToRefresh';
import { AmountDisplay, PaymentStatusBadge } from '@/components/payments';
import {EmptyState, ErrorState, SkeletonLoader} from '@/components/common';
import { OfficerScreenWrapper } from '@/components/officer';
import { useGetOfficerCustomerPaymentHistoryQuery } from '@/services/api/paymentCollectionApi';
import type { OfficerCollectionsStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<OfficerCollectionsStackParamList, 'CustomerPaymentHistory'>;

export function CustomerPaymentHistoryScreen({ route }: Props) {
  const { customerId, customerName } = route.params;
  const { data, isLoading, isError, error, refetch } =
    useGetOfficerCustomerPaymentHistoryQuery(customerId);
  const { refreshControl } = useOfficerPullToRefresh(refetch);

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
    <OfficerScreenWrapper scrollable={false}>
      <Text style={styles.title}>{customerName}</Text>
      <Text style={styles.subtitle}>Your cash collections for this assigned customer</Text>
      <FlatList
        refreshControl={refreshControl} 
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState title="No collections yet" subtitle="Payments you collect will appear here." />
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.number}>{item.payment_number || item.id.slice(0, 8)}</Text>
            <AmountDisplay amount={item.total_amount} />
            <PaymentStatusBadge status={item.status} />
            <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
          </View>
        )}
      />
    </OfficerScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xxs },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md },
  list: { paddingBottom: spacing.lg },
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
  date: { fontSize: 11, color: colors.textSecondary },
});
