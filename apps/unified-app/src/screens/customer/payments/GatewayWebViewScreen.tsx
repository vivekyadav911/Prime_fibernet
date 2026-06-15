import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { ErrorState, LoadingOverlay } from '@/components/common';
import { useAppSelector } from '@/store/hooks';
import { useCreatePaymentOrderV2Mutation } from '@/services/api/paymentCollectionApi';
import {
  buildGatewayCheckoutSource,
  parseWebViewPaymentMessage,
} from '@/services/gatewayAdapters';
import type { GatewaySlug } from '@/types/payments';
import type { CustomerStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<CustomerStackParamList, 'GatewayWebView'>;

function isGatewayNotConfigured(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('no active payment gateway') || lower.includes('gateway not configured');
}

export function GatewayWebViewScreen({ route, navigation }: Props) {
  const user = useAppSelector((s) => s.auth.user);
  const { amount, planName, customerId, paymentMethod } = route.params;
  const [createOrder, { isLoading, error }] = useCreatePaymentOrderV2Mutation();
  const [checkout, setCheckout] = useState<{
    paymentId: string;
    orderId: string;
    gatewaySlug: GatewaySlug;
    keyId: string;
    checkoutUrl: string | null;
    checkoutParams: Record<string, string> | null;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    createOrder({
      customerId,
      userName: user.name,
      userEmail: user.email,
      userPhone: '',
      amount,
      planName,
      paymentMethod,
    })
      .unwrap()
      .then((res) => {
        setCheckout({
          paymentId: res.paymentId,
          orderId: res.orderId,
          gatewaySlug: res.gatewaySlug as GatewaySlug,
          keyId: res.keyId,
          checkoutUrl: res.checkoutUrl,
          checkoutParams: res.checkoutParams,
        });
      })
      .catch(() => undefined);
  }, [amount, createOrder, customerId, paymentMethod, planName, user]);

  const source = useMemo(() => {
    if (!checkout || !user) return null;
    return buildGatewayCheckoutSource({
      gatewaySlug: checkout.gatewaySlug,
      keyId: checkout.keyId,
      orderId: checkout.orderId,
      amount,
      paymentId: checkout.paymentId,
      customerName: user.name,
      customerPhone: '',
      customerEmail: user.email,
      checkoutUrl: checkout.checkoutUrl,
      checkoutParams: checkout.checkoutParams,
    });
  }, [amount, checkout, user]);

  const onMessage = useCallback(
    (data: string) => {
      const result = parseWebViewPaymentMessage(data);
      if (result.success && checkout) {
        navigation.replace('PaymentSuccess', {
          paymentId: checkout.paymentId,
          amount,
          planName,
          activationDate: new Date().toISOString(),
        });
      } else if (!result.success && result.reason !== 'dismissed') {
        Alert.alert('Payment failed', result.reason ?? 'Unknown error');
      }
    },
    [amount, checkout, navigation, planName],
  );

  const errorMessage = error ? queryErrorMessage(error) : '';

  if (error && isGatewayNotConfigured(errorMessage)) {
    return (
      <Screen style={styles.pendingScreen}>
        <View style={styles.pendingCard}>
          <Text style={styles.pendingIcon}>💳</Text>
          <Text style={styles.pendingTitle}>Online payments not active yet</Text>
          <Text style={styles.pendingBody}>
            Your ISP is finishing payment gateway setup. You can pay cash to your field officer or visit our office in
            the meantime.
          </Text>
          <Button label="Back to bill" onPress={() => navigation.navigate('CustomerBill')} />
          <Button label="View payment history" variant="ghost" onPress={() => navigation.navigate('PaymentHistory')} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState message={errorMessage} />
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <LoadingOverlay visible={isLoading || !source} />
      <View style={styles.bar}>
        <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
      </View>
      {source ? (
        <WebView
          source={source.html ? { html: source.html } : { uri: source.uri! }}
          style={styles.webview}
          onMessage={(e) => onMessage(e.nativeEvent.data)}
          javaScriptEnabled
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceWhite },
  bar: { padding: spacing.sm, paddingTop: spacing.md },
  webview: { flex: 1 },
  pendingScreen: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: spacing.lg },
  pendingCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    gap: spacing.sm,
  },
  pendingIcon: { fontSize: 40, marginBottom: spacing.xs },
  pendingTitle: { fontSize: 18, fontWeight: '700', color: colors.primaryNavy, textAlign: 'center' },
  pendingBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.sm },
});
