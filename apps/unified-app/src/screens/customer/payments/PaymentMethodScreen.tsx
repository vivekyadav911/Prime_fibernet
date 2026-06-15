import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { PAYMENT_METHOD_CONFIG, type PaymentMethod } from '@/types/payments';
import type { CustomerStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type Props = NativeStackScreenProps<CustomerStackParamList, 'PaymentMethod'>;

const ONLINE_METHODS: PaymentMethod[] = ['upi', 'card', 'netbanking', 'wallet'];

export function PaymentMethodScreen({ route, navigation }: Props) {
  const { amount, planName, customerId } = route.params;
  const [method, setMethod] = useState<PaymentMethod>('upi');

  return (
    <Screen style={styles.screen}>
      <Text style={styles.title}>Choose payment method</Text>
      <Text style={styles.sub}>Pay ₹{amount.toFixed(2)} for {planName}</Text>
      <View style={styles.grid}>
        {ONLINE_METHODS.map((m) => {
          const cfg = PAYMENT_METHOD_CONFIG[m];
          const active = method === m;
          return (
            <Pressable
              key={m}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setMethod(m)}
            >
              <Text style={styles.chipIcon}>{cfg.icon}</Text>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{cfg.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Button
        label="Continue to payment"
        onPress={() =>
          navigation.navigate('GatewayWebView', {
            amount,
            planName,
            customerId,
            paymentMethod: method,
          })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.md, backgroundColor: colors.background },
  title: { fontSize: 18, fontWeight: '700', color: colors.primaryNavy },
  sub: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    width: '47%',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
    alignItems: 'center',
  },
  chipActive: { borderColor: colors.primaryNavy, backgroundColor: colors.background },
  chipIcon: { fontSize: 24 },
  chipLabel: { marginTop: spacing.xs, fontWeight: '600', color: colors.textSecondary },
  chipLabelActive: { color: colors.primaryNavy },
});
