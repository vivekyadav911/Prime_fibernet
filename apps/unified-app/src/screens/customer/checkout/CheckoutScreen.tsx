import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Screen, colors } from '@prime/ui';

import { useCreateOrderMutation, useGetPlanByIdQuery } from '@/services/api';
import { useAppSelector } from '@/store/hooks';
import type { CustomerStackParamList } from '@/types/navigation';
import { spacing } from '@/theme/spacing';

type Props = NativeStackScreenProps<CustomerStackParamList, 'Checkout'>;

const GST_RATE = 0.18;

function computeBreakdown(amount: number) {
  const subtotal = amount;
  const gst = Math.round(subtotal * GST_RATE);
  const total = subtotal + gst;
  return { subtotal, gst, total };
}

export function CheckoutScreen({ navigation, route }: Props) {
  const { planId, amount } = route.params;
  const user = useAppSelector((s) => s.auth.user);
  const { data: plan } = useGetPlanByIdQuery(planId);
  const [createOrder, { isLoading }] = useCreateOrderMutation();

  const { subtotal, gst, total } = computeBreakdown(amount);

  const onPayNow = async () => {
    if (!user || !plan) return;
    try {
      const order = await createOrder({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        planId: plan.id,
        planName: plan.name,
        amount: total,
      }).unwrap();

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
    } catch {
      // Error surfaced via RTK; button re-enabled when isLoading false
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
        <Text style={styles.sectionTitle}>Price breakdown</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Subtotal</Text>
          <Text style={styles.value}>₹{subtotal.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>GST (18%)</Text>
          <Text style={styles.value}>₹{gst.toLocaleString('en-IN')}</Text>
        </View>
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{total.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      <Button label={isLoading ? 'Creating order…' : 'Pay Now'} onPress={onPayNow} disabled={isLoading || !plan} />
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
