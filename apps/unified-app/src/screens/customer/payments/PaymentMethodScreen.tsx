import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { AmountDisplay } from '@/components/payments';
import { PAYMENT_METHOD_CONFIG, type PaymentMethod } from '@/types/payments';
import { useGetActivePaymentGatewayQuery } from '@/services/api/paymentCollectionApi';
import type { CustomerStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type Props = NativeStackScreenProps<CustomerStackParamList, 'PaymentMethod'>;

const ONLINE_METHODS: PaymentMethod[] = ['upi', 'card', 'netbanking', 'wallet'];

export function PaymentMethodScreen({ route, navigation }: Props) {
  const { amount, planName, customerId, paymentMethod: initialMethod } = route.params;
  const [method, setMethod] = useState<PaymentMethod>(initialMethod ?? 'upi');
  const { data: activeGateway } = useGetActivePaymentGatewayQuery();

  const gatewayReady = Boolean(activeGateway);

  return (
    <Screen style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Choose payment method</Text>
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>You are paying</Text>
          <AmountDisplay amount={amount} large />
          <Text style={styles.sub}>{planName}</Text>
        </View>

        <View style={styles.grid}>
          {ONLINE_METHODS.map((m) => {
            const cfg = PAYMENT_METHOD_CONFIG[m];
            const active = method === m;
            const supported = !activeGateway || activeGateway.supported_methods.includes(m);
            return (
              <Pressable
                key={m}
                style={[styles.chip, active && styles.chipActive, !supported && styles.chipDisabled]}
                onPress={() => supported && setMethod(m)}
                disabled={!supported}
              >
                <Text style={styles.chipIcon}>{cfg.icon}</Text>
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{cfg.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {!gatewayReady ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Online checkout is not configured yet. Continuing will show setup instructions — cash collection remains
              available.
            </Text>
          </View>
        ) : (
          <Text style={styles.gateway}>Secured by {activeGateway?.display_name}</Text>
        )}

        <Button
          label={gatewayReady ? 'Continue to payment' : 'Check availability'}
          onPress={() =>
            navigation.navigate('GatewayWebView', {
              amount,
              planName,
              customerId,
              paymentMethod: method,
            })
          }
        />
        <Button label="Back to bill" variant="ghost" onPress={() => navigation.goBack()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { fontSize: 18, fontWeight: '700', color: colors.primaryNavy, marginBottom: spacing.md },
  amountCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
  },
  amountLabel: { fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase', fontWeight: '600' },
  sub: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs },
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
  chipDisabled: { opacity: 0.45 },
  chipIcon: { fontSize: 24 },
  chipLabel: { marginTop: spacing.xs, fontWeight: '600', color: colors.textSecondary },
  chipLabelActive: { color: colors.primaryNavy },
  notice: {
    backgroundColor: '#FFF8E1',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  noticeText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  gateway: { textAlign: 'center', fontSize: 11, color: colors.textSecondary, marginBottom: spacing.sm },
});
