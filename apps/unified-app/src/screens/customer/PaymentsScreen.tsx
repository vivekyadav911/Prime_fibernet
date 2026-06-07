import { FlatList, StyleSheet, Text, View } from 'react-native';
import { EmptyState, ErrorState, Screen, colors } from '@prime/ui';

import { useAppSelector } from '@/store/hooks';
import { useCreatePaymentOrderMutation, useGetPaymentHistoryQuery } from '@/store/api/endpoints';

export function PaymentsScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data, error, refetch } = useGetPaymentHistoryQuery(user?.id ?? '', { skip: !user?.id });
  const [createOrder] = useCreatePaymentOrderMutation();

  if (error) {
    return (
      <Screen>
        <ErrorState message="Failed to load payments" onRetry={refetch} />
      </Screen>
    );
  }

  if (!data?.length) {
    return (
      <Screen>
        <EmptyState title="No payments yet" description="Your payment history will appear here" />
      </Screen>
    );
  }

  const total = data.filter((p) => p.paymentStatus === 'success').reduce((s, p) => s + p.amount, 0);

  return (
    <Screen padded={false}>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Total spent</Text>
        <Text style={styles.summaryValue}>₹{total.toFixed(2)}</Text>
        <Text style={styles.payNow} onPress={() => createOrder({ planId: '', amount: 0 })}>
          Pay now
        </Text>
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.amount}>₹{item.amount}</Text>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.status}>{item.paymentStatus}</Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { padding: 16, backgroundColor: colors.primaryNavy },
  summaryLabel: { color: colors.white, opacity: 0.8 },
  summaryValue: { color: colors.white, fontSize: 28, fontWeight: '700' },
  payNow: { color: colors.accentTeal, marginTop: 8, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  amount: { fontWeight: '600' },
  date: { color: colors.textSecondary, fontSize: 12 },
  status: { textTransform: 'capitalize', color: colors.accentTeal },
});
