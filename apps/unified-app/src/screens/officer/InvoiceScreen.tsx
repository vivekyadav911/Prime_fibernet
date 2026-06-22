import { useCallback } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import type { DrawerScreenProps } from '@react-navigation/drawer';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Button, Screen } from '@prime/ui';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import {
  useGetInvoiceQuery,
  useLazyGetInvoiceUrlQuery,
} from '@/store/api/endpoints';
import type { CustomerStackParamList, OfficerDrawerParamList } from '@/types/navigation';
import { queryErrorMessage } from '@/utils/queryError';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type OfficerProps = DrawerScreenProps<OfficerDrawerParamList, 'Invoice'>;
type CustomerProps = NativeStackScreenProps<CustomerStackParamList, 'Invoice'>;

type InvoiceScreenProps = OfficerProps | CustomerProps;

export function InvoiceContent({ invoiceId }: { invoiceId: string }) {
  const { data, isLoading, isError, error, refetch } = useGetInvoiceQuery(invoiceId);
  const [fetchInvoiceUrl] = useLazyGetInvoiceUrlQuery();

  const onDownload = useCallback(async () => {
    try {
      const url = await fetchInvoiceUrl(invoiceId).unwrap();
      if (!url) {
        Alert.alert('Invoice unavailable', 'PDF is not ready yet.');
        return;
      }
      if (await Sharing.isAvailableAsync()) {
        const filename = `${FileSystem.cacheDirectory}invoice-${invoiceId}.pdf`;
        const result = await FileSystem.downloadAsync(url, filename);
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: 'Invoice',
        });
      } else {
        await Share.share({ url, message: 'Prime Fibernet invoice' });
      }
    } catch {
      Alert.alert('Download failed', 'Could not fetch invoice PDF.');
    }
  }, [fetchInvoiceUrl, invoiceId]);

  const onShare = useCallback(async () => {
    if (!data) return;
    const message = [
      'Prime Fibernet Invoice',
      `Invoice: ${data.invoiceNumber ?? data.id}`,
      `Customer: ${data.customerName}`,
      `Plan: ${data.planName ?? '—'}`,
      `Amount: ₹${data.totalAmount.toFixed(2)}`,
      `Date: ${new Date(data.createdAt).toLocaleDateString()}`,
    ].join('\n');
    await Share.share({ message });
  }, [data]);

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={6} rowHeight={40} shape="card" />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <EmptyState title="Invoice not found" subtitle="This payment may have been removed" icon="🧾" />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Invoice</Text>
        <Text style={styles.number}>{data.invoiceNumber ?? data.id.slice(0, 8).toUpperCase()}</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Customer</Text>
          <Text style={styles.value}>{data.customerName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Plan</Text>
          <Text style={styles.value}>{data.planName ?? '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Amount</Text>
          <Text style={styles.value}>₹{data.amount.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>GST (18%)</Text>
          <Text style={styles.value}>₹{data.gstAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total</Text>
          <Text style={[styles.value, styles.total]}>₹{data.totalAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{new Date(data.createdAt).toLocaleDateString()}</Text>
        </View>
        {data.paymentMethod ? (
          <View style={styles.row}>
            <Text style={styles.label}>Method</Text>
            <Text style={styles.value}>{data.paymentMethod}</Text>
          </View>
        ) : null}
      </View>

      <Button label="Download PDF" onPress={() => void onDownload()} style={styles.button} />
      <Button label="Share" variant="secondary" onPress={() => void onShare()} />
    </Screen>
  );
}

export function InvoiceScreen(props: InvoiceScreenProps) {
  const invoiceId = props.route.params?.invoiceId;
  if (!invoiceId) {
    return (
      <Screen>
        <EmptyState
          title="No invoice selected"
          subtitle="Open an invoice from a payment or collection record"
          icon="🧾"
        />
      </Screen>
    );
  }
  return <InvoiceContent invoiceId={invoiceId} />;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.sm,
  },
  title: { fontSize: 14, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  number: { fontSize: 24, fontWeight: '700', color: colors.primaryNavy, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: colors.textSecondary, fontSize: 14 },
  value: { color: colors.textPrimary, fontWeight: '600', fontSize: 14 },
  total: { fontSize: 18, color: colors.accentTeal },
  button: { marginTop: spacing.md },
});
