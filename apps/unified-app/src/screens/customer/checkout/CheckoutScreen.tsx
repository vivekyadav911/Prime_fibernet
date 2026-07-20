import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Screen, colors } from '@prime/ui';

import {
  subscriptionsApi,
  useCreateOrderMutation,
  useGetPlanByIdQuery,
  useVerifyPaymentMutation,
} from '@/services/api';
import { resolvePaymentProviderSlug } from '@/services/payment/PaymentProvider';
import { useRazorpayCheckout } from '@/services/payments/razorpayCheckout';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { CustomerStackParamList } from '@/types/navigation';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<CustomerStackParamList, 'Checkout'>;

type CreatedOrder = {
  paymentId: string;
  orderId: string;
  checkoutUrl: string | null;
  gateway: 'razorpay' | 'easybuzz';
  amount: number;
  keyId: string;
};

export function CheckoutScreen({ navigation, route }: Props) {
  const { planId, amount } = route.params;
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const { data: plan } = useGetPlanByIdQuery(planId);
  const [createOrder, { isLoading }] = useCreateOrderMutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const { openCheckout, RazorpayUI } = useRazorpayCheckout();

  const onRazorpaySuccess = async (
    order: CreatedOrder,
    rzp: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string },
  ) => {
    try {
      await verifyPayment({
        paymentId: order.paymentId,
        orderId: order.orderId,
        gateway: order.gateway,
        planId,
        razorpayPaymentId: rzp.razorpay_payment_id,
        razorpaySignature: rzp.razorpay_signature,
      }).unwrap();
      dispatch(subscriptionsApi.util.invalidateTags(['Subscriptions']));
      navigation.replace('PaymentSuccess', {
        paymentId: order.paymentId,
        amount: order.amount,
        planName: plan?.name ?? 'Your plan',
        activationDate: new Date().toISOString(),
      });
    } catch {
      Alert.alert(
        'Verification pending',
        'Your payment was received but is still being verified. Check Payment History in a minute for the final status.',
      );
    }
  };

  const onPayNow = async () => {
    if (!user || !plan) return;
    try {
      const order = (await createOrder({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        planId: plan.id,
        planName: plan.name,
        amount,
      }).unwrap()) as CreatedOrder;

      if (resolvePaymentProviderSlug(order.gateway) === 'razorpay') {
        openCheckout(
          {
            key: order.keyId,
            amount: Math.round(order.amount * 100),
            currency: 'INR',
            order_id: order.orderId,
            name: 'Prime Fibernet',
            description: `Plan - ${plan.name}`,
            prefill: { name: user.name, email: user.email ?? '', contact: '' },
            theme: { color: '#3D52D5' },
            modal: { confirm_close: true, animation: true },
          },
          {
            onSuccess: (rzp) => {
              void onRazorpaySuccess(order, {
                razorpay_payment_id: rzp.razorpay_payment_id,
                razorpay_order_id: rzp.razorpay_order_id,
                razorpay_signature: rzp.razorpay_signature,
              });
            },
            onFailure: (err) => {
              Alert.alert(
                'Payment failed',
                err.description ?? 'Payment could not be completed. No amount was charged.',
              );
            },
          },
        );
        return;
      }

      navigation.navigate('PaymentGateway', {
        orderId: order.orderId,
        amount: order.amount,
        userInfo: {
          paymentId: order.paymentId,
          checkoutUrl: order.checkoutUrl,
          gateway: order.gateway,
          planName: plan.name,
        },
      });
    } catch (e) {
      Alert.alert('Payment could not be started', queryErrorMessage(e, 'Please try again in a moment.'));
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Order summary</Text>

      <View style={styles.card}>
        <Text style={styles.planName}>{plan?.name ?? 'Plan'}</Text>
        <Text style={styles.meta}>
          {plan ? `${plan.speedMbps} Mbps · ${plan.validityDays} days` : 'Loading plan…'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Price</Text>
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{amount.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      <Button label={isLoading ? 'Creating order…' : 'Pay Now'} onPress={onPayNow} disabled={isLoading || !plan} />
      {RazorpayUI}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.xs,
  },
  planName: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  meta: { color: colors.textSecondary },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xxs },
  label: { color: colors.textSecondary },
  value: { color: colors.textPrimary, fontWeight: '500' },
  totalRow: { borderTopWidth: 1, borderColor: colors.borderDefault, marginTop: spacing.sm, paddingTop: spacing.sm },
  totalLabel: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  totalValue: { fontSize: 20, fontWeight: '700', color: colors.accentTeal },
});
