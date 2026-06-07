import { useState } from 'react';
import { FlatList, Linking, StyleSheet, Text, View } from 'react-native';
import { EmptyState, ErrorState, Screen, StatusChip, colors } from '@prime/ui';
import type { PaymentGateway } from '@prime/types';

import { PaymentCheckoutWebView } from '@/components/PaymentCheckoutWebView';
import { useAppSelector } from '@/store/hooks';
import {
  useCreatePaymentOrderMutation,
  useGetActiveSubscriptionQuery,
  useGetInvoiceUrlMutation,
  useGetPaymentHistoryQuery,
  useVerifyPaymentMutation,
} from '@/store/api/endpoints';

export function PaymentsScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const { data, error, refetch } = useGetPaymentHistoryQuery(user?.id ?? '', { skip: !user?.id });
  const { data: subscription } = useGetActiveSubscriptionQuery(user?.id ?? '', { skip: !user?.id });
  const [createOrder] = useCreatePaymentOrderMutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [getInvoice] = useGetInvoiceUrlMutation();
  const [checkout, setCheckout] = useState<{
    url: string | null;
    paymentId: string;
    orderId: string;
    gateway: PaymentGateway;
  } | null>(null);

  const onPayNow = async () => {
    if (!user || !subscription) return;
    const result = await createOrder({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      planId: subscription.planId,
      planName: subscription.planName ?? 'Renewal',
      amount: 499,
    }).unwrap();
    setCheckout({
      url: result.checkoutUrl,
      paymentId: result.paymentId,
      orderId: result.orderId,
      gateway: result.gateway,
    });
  };

  const onDownloadInvoice = async (paymentId: string, existingUrl?: string | null) => {
    if (existingUrl) {
      await Linking.openURL(existingUrl);
      return;
    }
    const url = await getInvoice(paymentId).unwrap();
    if (url) await Linking.openURL(url);
  };

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
        {subscription ? (
          <Text style={styles.payNow} onPress={onPayNow}>Pay now / Renew</Text>
        ) : null}
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.amount}>₹{item.amount}</Text>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              {item.paymentStatus === 'success' ? (
                <Text style={styles.invoice} onPress={() => onDownloadInvoice(item.id, item.invoiceUrl)}>
                  Download invoice
                </Text>
              ) : null}
            </View>
            <StatusChip status={item.paymentStatus} />
          </View>
        )}
      />
      <PaymentCheckoutWebView
        visible={!!checkout}
        checkoutUrl={checkout?.url ?? null}
        paymentId={checkout?.paymentId ?? ''}
        orderId={checkout?.orderId ?? ''}
        gateway={checkout?.gateway ?? 'easybuzz'}
        onClose={() => setCheckout(null)}
        onSuccess={() => refetch()}
        onVerify={(p) => verifyPayment(p).unwrap().then(() => undefined)}
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
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  amount: { fontWeight: '600' },
  date: { color: colors.textSecondary, fontSize: 12 },
  invoice: { color: colors.accentTeal, fontSize: 12, marginTop: 4 },
});
