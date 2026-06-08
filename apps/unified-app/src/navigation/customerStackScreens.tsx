import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@prime/ui';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import type { CustomerStackParamList } from '@/types/navigation';

import { CheckoutScreen } from '@/screens/customer/checkout/CheckoutScreen';
import { PaymentGatewayScreen } from '@/screens/customer/checkout/PaymentGatewayScreen';
import { PaymentSuccessScreen } from '@/screens/customer/checkout/PaymentSuccessScreen';
import { PlanDetailsScreen } from '@/screens/customer/plans/PlanDetailsScreen';

export { PlanDetailsScreen, CheckoutScreen, PaymentGatewayScreen, PaymentSuccessScreen };

type ScreenProps<K extends keyof CustomerStackParamList> = NativeStackScreenProps<
  CustomerStackParamList,
  K
>;

function PendingScreen({ title, detail }: { title: string; detail?: string }) {
  return (
    <Screen>
      <View style={styles.box}>
        <Text style={styles.title}>{title}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        <Text style={styles.note}>Screen mapped from Flutter — migration pending.</Text>
      </View>
    </Screen>
  );
}

/** Flutter: `/payment-selection` */
export function PaymentSelectionScreen({ route }: ScreenProps<'PaymentSelection'>) {
  return (
    <PendingScreen
      title="Payment selection"
      detail={`Plan ${route.params.planId} · ₹${route.params.amount}`}
    />
  );
}

/** Flutter: `/make-payment` */
export function MakePaymentScreen({ route }: ScreenProps<'MakePayment'>) {
  return <PendingScreen title="Make payment" detail={route.params?.userId} />;
}

/** Flutter: `/payment-history` */
export function PaymentHistoryScreen(_props: ScreenProps<'PaymentHistory'>) {
  return <PendingScreen title="Payment history" />;
}

/** Flutter: `CreateRequestScreen` (MaterialPageRoute push) */
export function CreateRequestScreen({ route }: ScreenProps<'CreateRequest'>) {
  return (
    <PendingScreen
      title="Create request"
      detail={route.params?.planId ? `Plan: ${route.params.planId}` : undefined}
    />
  );
}

/** Flutter: `RequestDetailsScreen` push */
export function RequestDetailsScreen({ route }: ScreenProps<'RequestDetails'>) {
  return <PendingScreen title="Request details" detail={`Request ID: ${route.params.requestId}`} />;
}

/** Flutter: `/notifications` */
export function CustomerNotificationsScreen(_props: ScreenProps<'Notifications'>) {
  return <PendingScreen title="Notifications" />;
}

/** Flutter: `/about` */
export function AboutScreen(_props: ScreenProps<'About'>) {
  return <PendingScreen title="About us" />;
}

/** Flutter: `/terms` */
export function TermsScreen(_props: ScreenProps<'Terms'>) {
  return <PendingScreen title="Terms & conditions" />;
}

/** Flutter: `/privacy` */
export function PrivacyScreen(_props: ScreenProps<'Privacy'>) {
  return <PendingScreen title="Privacy policy" />;
}

/** Flutter: `/refund` */
export function RefundScreen(_props: ScreenProps<'Refund'>) {
  return <PendingScreen title="Refund policy" />;
}

const styles = StyleSheet.create({
  box: { gap: spacing.xs },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  detail: { color: colors.textSecondary },
  note: { marginTop: 12, color: colors.textSecondary, fontSize: 13 },
});
