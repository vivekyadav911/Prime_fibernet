import { useCallback } from 'react';
import { Alert, FlatList, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Sharing from 'expo-sharing';
import { Screen } from '@prime/ui';

import { AmountDisplay, PaymentStatusBadge } from '@/components/payments';
import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { useAppSelector } from '@/store/hooks';
import { useGetCustomerPaymentHistoryV2Query, useLazyGetPaymentReceiptQuery } from '@/services/api/paymentCollectionApi';
import type { CustomerStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

export function PaymentHistoryScreenV2() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  const user = useAppSelector((s) => s.auth.user);
  const { data, isLoading, isError, error, refetch } = useGetCustomerPaymentHistoryV2Query(user?.id ?? '', {
    skip: !user?.id,
  });
  const [fetchReceipt] = useLazyGetPaymentReceiptQuery();

  const onReceipt = useCallback(
    async (paymentId: string) => {
      try {
        const result = await fetchReceipt(paymentId).unwrap();
        if (result.url && (await Sharing.isAvailableAsync())) {
          await Share.share({ url: result.url, message: `Receipt ${result.receiptNumber}` });
        } else {
          navigation.navigate('Receipt', { paymentId });
        }
      } catch (e) {
        Alert.alert('Receipt', e instanceof Error ? e.message : 'Unavailable');
      }
    },
    [fetchReceipt, navigation],
  );

  if (isLoading) return <Screen><SkeletonLoader rows={5} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Payment history</Text>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState title="No payments" subtitle="Your payment history will appear here." />}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => item.status === 'confirmed' && onReceipt(item.id)}
          >
            <View style={styles.rowTop}>
              <Text style={styles.number}>{item.payment_number}</Text>
              <PaymentStatusBadge status={item.status} />
            </View>
            <AmountDisplay amount={item.total_amount} />
            <Text style={styles.meta}>
              {item.method.toUpperCase()}
              {item.gateway_slug ? ` · ${item.gateway_slug}` : ''}
            </Text>
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.md, backgroundColor: colors.background },
  title: { fontSize: 20, fontWeight: '700', color: colors.primaryNavy, marginBottom: spacing.md },
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
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: 11, color: colors.textSecondary, textTransform: 'capitalize' },
  date: { fontSize: 12, color: colors.textSecondary },
});
