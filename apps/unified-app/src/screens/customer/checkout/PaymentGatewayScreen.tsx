import { useCallback, useRef, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { Screen, colors } from '@prime/ui';

import { subscriptionsApi, useVerifyPaymentMutation } from '@/services/api';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import type { CustomerStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<CustomerStackParamList, 'PaymentGateway'>;

function isSuccessUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes('payment_success') || lower.includes('razorpay_payment_id');
}

function isFailureUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes('payment_failed') || lower.includes('cancel');
}

export function PaymentGatewayScreen({ navigation, route }: Props) {
  const { orderId, amount, userInfo } = route.params;
  const dispatch = useAppDispatch();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [loading, setLoading] = useState(true);
  const handledRef = useRef(false);

  const onSuccess = useCallback(async () => {
    if (handledRef.current) return;
    handledRef.current = true;

    try {
      await verifyPayment({
        paymentId: userInfo.paymentId,
        orderId,
        gateway: userInfo.gateway,
      }).unwrap();

      dispatch(subscriptionsApi.util.invalidateTags(['Subscriptions']));

      navigation.replace('PaymentSuccess', {
        paymentId: userInfo.paymentId,
        amount,
        planName: userInfo.planName ?? 'Your plan',
        activationDate: new Date().toISOString(),
      });
    } catch {
      handledRef.current = false;
      dispatch(
        enqueueToast({
          id: `payment-verify-${Date.now()}`,
          type: 'error',
          message: 'Payment verification failed. Please contact support.',
        }),
      );
      navigation.goBack();
    }
  }, [amount, dispatch, navigation, orderId, userInfo, verifyPayment]);

  const onFailure = useCallback(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    dispatch(
      enqueueToast({
        id: `payment-failed-${Date.now()}`,
        type: 'error',
        message: 'Payment was cancelled or failed.',
      }),
    );
    navigation.goBack();
  }, [dispatch, navigation]);

  const onNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      const url = navState.url ?? '';
      if (isSuccessUrl(url)) {
        void onSuccess();
      } else if (isFailureUrl(url)) {
        onFailure();
      }
    },
    [onFailure, onSuccess],
  );

  return (
    <Screen padded={false}>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primaryNavy} />
        </View>
      ) : null}
      {userInfo.checkoutUrl ? (
        <WebView
          source={{ uri: userInfo.checkoutUrl }}
          style={styles.webview}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={onNavigationStateChange}
        />
      ) : (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primaryNavy} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1 },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    zIndex: 1,
  },
});
