import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
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
import { spacing } from '@/theme/spacing';

type Props = NativeStackScreenProps<CustomerStackParamList, 'GatewayWebView'>;

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
      userPhone: user.phone,
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
      customerPhone: user.phone ?? '',
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

  if (error) {
    return <Screen><ErrorState message={error instanceof Error ? error.message : 'Order failed'} /></Screen>;
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
});
