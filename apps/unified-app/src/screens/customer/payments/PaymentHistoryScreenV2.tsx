import { useCallback } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Sharing from 'expo-sharing';

import { AmountDisplay, PaymentStatusBadge } from '@/components/payments';
import {
  CustomerEmptyState,
  CustomerErrorState,
  CustomerSkeletonLoader,
  GlassCard,
  PressableScale,
} from '@/components/customer/ui';
import { useAppSelector } from '@/store/hooks';
import { useGetCustomerPaymentHistoryV2Query, useLazyGetPaymentReceiptQuery } from '@/services/api/paymentCollectionApi';
import type { CustomerStackParamList } from '@/types/navigation';
import { signalGlass } from '@/theme/customer/signalGlass';
import { queryErrorMessage } from '@/utils/queryError';
import { DismissKeyboardFlatList } from '@/components/common';

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
        Alert.alert('Receipt unavailable', e instanceof Error ? e.message : 'Try again in a moment.');
      }
    },
    [fetchReceipt, navigation],
  );

  if (isLoading) {
    return (
      <View style={styles.canvas}>
        <CustomerSkeletonLoader rows={5} rowHeight={88} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.canvas}>
        <CustomerErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={styles.canvas}>
      <Text style={styles.title}>Payment history</Text>
      <DismissKeyboardFlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <CustomerEmptyState
            title="No payments yet"
            subtitle="Your payment history will appear here after you pay a bill"
            icon="💳"
          />
        }
        renderItem={({ item }) => (
          <PressableScale
            style={styles.rowWrap}
            onPress={() => item.status === 'confirmed' && void onReceipt(item.id)}
            accessibilityLabel={`Payment ${item.payment_number}`}
          >
            <GlassCard padded style={styles.row}>
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
            </GlassCard>
          </PressableScale>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, padding: signalGlass.spacing.lg, backgroundColor: signalGlass.colors.bgDeep },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.display,
    marginBottom: signalGlass.spacing.md,
  },
  list: { paddingBottom: signalGlass.spacing.xxxl },
  rowWrap: { marginBottom: signalGlass.spacing.sm },
  row: { gap: signalGlass.spacing.xs },
  number: {
    fontFamily: signalGlass.fonts.mono,
    fontWeight: '700',
    color: signalGlass.colors.textPrimary,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: 11, color: signalGlass.colors.textSecondary, textTransform: 'capitalize' },
  date: { fontSize: 12, color: signalGlass.colors.textMuted },
});
