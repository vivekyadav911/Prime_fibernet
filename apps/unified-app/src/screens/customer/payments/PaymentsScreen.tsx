import { useCallback, useState } from 'react';
import { Alert, FlatList, Share, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { Payment, PaymentGateway } from '@prime/types';
import { Screen } from '@prime/ui';

import { PaymentCheckoutWebView } from '@/components/PaymentCheckoutWebView';
import { EmptyState, ErrorState, LoadingOverlay, SkeletonLoader } from '@/components/common';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { DateRangeChips } from './components/DateRangeChips';
import { PaymentHistoryItem } from './components/PaymentHistoryItem';
import { PaymentSummaryCard } from './components/PaymentSummaryCard';
import type { CustomerStackParamList } from '@/types/navigation';

import { usePayments } from './hooks/usePayments';

export function PaymentsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  const {
    payments,
    totalSpent,
    subscription,
    dateRange,
    setDateRange,
    isLoading,
    error,
    refetch,
    payRenewal,
    retryPayment,
    downloadInvoice,
    verifyPayment,
  } = usePayments();

  const [checkout, setCheckout] = useState<{
    url: string | null;
    paymentId: string;
    orderId: string;
    gateway: PaymentGateway;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const handleDownload = async (payment: Payment) => {
    setBusy(true);
    try {
      const url = await downloadInvoice(payment.id, payment.invoiceUrl);
      if (!url) {
        Alert.alert('Invoice unavailable', 'Try again later.');
        return;
      }
      if (await Sharing.isAvailableAsync()) {
        const filename = `${FileSystem.cacheDirectory}invoice-${payment.id}.pdf`;
        const result = await FileSystem.downloadAsync(url, filename);
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: 'Invoice',
        });
      } else {
        await Share.share({ url, message: 'Your Prime Fibernet invoice' });
      }
    } catch {
      Alert.alert('Download failed', 'Could not fetch invoice. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const openCheckout = async (action: () => Promise<{
    checkoutUrl: string | null;
    paymentId: string;
    orderId: string;
    gateway: PaymentGateway;
  }>) => {
    setBusy(true);
    try {
      const result = await action();
      setCheckout({
        url: result.checkoutUrl,
        paymentId: result.paymentId,
        orderId: result.orderId,
        gateway: result.gateway,
      });
    } finally {
      setBusy(false);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: Payment }) => (
      <PaymentHistoryItem
        payment={item}
        onDownload={() => handleDownload(item)}
        onRetry={() => openCheckout(() => retryPayment(item))}
      />
    ),
    [],
  );

  if (error) {
    return (
      <Screen>
        <ErrorState message="Failed to load payments" onRetry={refetch} />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={5} rowHeight={64} shape="card" />
      </Screen>
    );
  }

  return (
    <Screen padded={false} style={styles.screen}>
      <PaymentSummaryCard
        totalSpent={totalSpent}
        showPayNow={!!subscription}
        onPayNow={() => openCheckout(payRenewal)}
        onViewBills={() => navigation.navigate('MyBills')}
      />
      <DateRangeChips selected={dateRange} onSelect={setDateRange} />
      {!payments.length ? (
        <EmptyState
          title="No payments yet"
          subtitle="Your payment history will appear here"
          icon="💳"
        />
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
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
      <LoadingOverlay visible={busy} message="Preparing payment…" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  list: { paddingBottom: spacing.xl },
});
