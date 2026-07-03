import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import {
  buildGatewayCheckoutSource,
  parsePaymentCallbackUrl,
  parseWebViewPaymentMessage,
} from '@/services/gatewayAdapters';
import type { PaymentCheckoutSession, PaymentCustomerContext } from '@/services/payment/PaymentProvider';
import type { CustomerTheme } from '@/theme/customer';

type EasebuzzCheckoutProps = {
  visible: boolean;
  session: PaymentCheckoutSession | null;
  customer: PaymentCustomerContext;
  onClose: () => void;
  onComplete: (result: { success: boolean; paymentId: string; orderId?: string; reason?: string }) => void;
};

export function EasebuzzCheckout({
  visible,
  session,
  customer,
  onClose,
  onComplete,
}: EasebuzzCheckoutProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useCustomerTheme();
  const styles = useThemedStyles(createStyles);
  const handledRef = useRef(false);

  useEffect(() => {
    if (visible && session) {
      handledRef.current = false;
    }
  }, [visible, session?.paymentId]);

  const source = useMemo(() => {
    if (!session) return null;
    return buildGatewayCheckoutSource({
      gatewaySlug: session.gatewaySlug,
      keyId: session.keyId,
      orderId: session.orderId,
      amount: session.amount,
      paymentId: session.paymentId,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      checkoutUrl: session.checkoutUrl,
      checkoutParams: session.checkoutParams,
    });
  }, [customer.email, customer.name, customer.phone, session]);

  const finish = useCallback(
    (success: boolean, reason?: string) => {
      if (!session || handledRef.current) return;
      handledRef.current = true;
      onComplete({
        success,
        paymentId: session.paymentId,
        orderId: session.orderId,
        reason,
      });
    },
    [onComplete, session],
  );

  const onMessage = useCallback(
    (data: string) => {
      const result = parseWebViewPaymentMessage(data);
      if (result.success) {
        finish(true);
      } else if (result.reason !== 'dismissed') {
        finish(false, result.reason ?? 'Payment failed');
      }
    },
    [finish],
  );

  const onNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      const url = navState.url ?? '';
      const callback = parsePaymentCallbackUrl(url);
      if (!callback.isCallback) return;
      if (callback.success) {
        finish(true);
      } else {
        finish(false, 'Payment was cancelled or failed');
      }
    },
    [finish],
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close payment">
            <Text style={styles.closeText}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Secure checkout</Text>
          <View style={styles.closeBtn} />
        </View>

        {!source ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loaderText}>Preparing checkout…</Text>
          </View>
        ) : (
          <WebView
            source={source.html ? { html: source.html } : { uri: source.uri! }}
            style={styles.webview}
            onMessage={(e) => onMessage(e.nativeEvent.data)}
            onNavigationStateChange={onNavigationStateChange}
            javaScriptEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loader}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.bgDeep,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSubtle,
      minHeight: 48,
    },
    closeBtn: {
      minWidth: 72,
      minHeight: 48,
      justifyContent: 'center',
    },
    closeText: {
      ...theme.typography.body,
      color: theme.colors.primary,
      fontFamily: theme.fonts.bodySemiBold,
    },
    title: {
      ...theme.typography.bodyLg,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
    },
    webview: {
      flex: 1,
      backgroundColor: theme.colors.bgSurface,
    },
    loader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
    },
    loaderText: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
    },
  });
