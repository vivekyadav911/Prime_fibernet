import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomerButton } from '@/components/customer/ui';
import { formatINR } from '@/utils/currencyFormat';
import { PAYMENT_METHOD_CONFIG, type PaymentMethod } from '@/types/payments';
import { useGetActivePaymentGatewayQuery } from '@/services/api/paymentCollectionApi';
import type { CustomerStackParamList } from '@/types/navigation';
import { signalGlass } from '@/theme/customer/signalGlass';

type Props = NativeStackScreenProps<CustomerStackParamList, 'PaymentMethod'>;

const ONLINE_METHODS: PaymentMethod[] = ['upi', 'card', 'netbanking', 'wallet'];

const METHOD_ICONS: Record<PaymentMethod, keyof typeof MaterialCommunityIcons.glyphMap> = {
  upi: 'qrcode-scan',
  card: 'credit-card-outline',
  netbanking: 'bank-outline',
  wallet: 'wallet-outline',
  cash: 'cash',
  cheque: 'checkbook',
};

const METHOD_SUBTITLES: Partial<Record<PaymentMethod, string>> = {
  upi: 'GPay, PhonePe, Paytm',
  card: 'Visa, Mastercard, RuPay',
  netbanking: 'All major banks supported',
  wallet: 'Amazon Pay, Mobikwik',
};

export function PaymentMethodScreen({ route, navigation }: Props) {
  const { amount, planName, customerId, paymentMethod: initialMethod } = route.params;
  const [method, setMethod] = useState<PaymentMethod>(initialMethod ?? 'upi');
  const { data: activeGateway } = useGetActivePaymentGatewayQuery();
  const insets = useSafeAreaInsets();

  const gatewayReady = Boolean(activeGateway);

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={() => navigation.goBack()} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, signalGlass.spacing.lg) }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Select Payment Method</Text>
        <Text style={styles.amountLabel}>
          {formatINR(amount)} · {planName}
        </Text>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {ONLINE_METHODS.map((m) => {
            const cfg = PAYMENT_METHOD_CONFIG[m];
            const active = method === m;
            const supported = !activeGateway || activeGateway.supported_methods.includes(m);
            return (
              <Pressable
                key={m}
                style={[styles.option, active && styles.optionActive, !supported && styles.optionDisabled]}
                onPress={() => supported && setMethod(m)}
                disabled={!supported}
              >
                <View style={styles.optionLeft}>
                  <View style={[styles.optionIcon, active && styles.optionIconActive]}>
                    <MaterialCommunityIcons
                      name={METHOD_ICONS[m]}
                      size={24}
                      color={active ? signalGlass.colors.primary : signalGlass.colors.onSurfaceVariant}
                    />
                  </View>
                  <View>
                    <Text style={styles.optionTitle}>{cfg.label}</Text>
                    <Text style={styles.optionSub}>{METHOD_SUBTITLES[m]}</Text>
                  </View>
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? <View style={styles.radioDot} /> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {!gatewayReady ? (
          <Text style={styles.notice}>
            Online checkout is not configured yet. Cash collection remains available through your field officer.
          </Text>
        ) : (
          <Text style={styles.gateway}>Secured by {activeGateway?.display_name}</Text>
        )}

        <CustomerButton
          label={gatewayReady ? 'Proceed to Pay' : 'Check availability'}
          onPress={() =>
            navigation.navigate('GatewayWebView', {
              amount,
              planName,
              customerId,
              paymentMethod: method,
            })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: signalGlass.colors.overlay,
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: signalGlass.colors.surfaceContainer,
    borderTopLeftRadius: signalGlass.radius.xl,
    borderTopRightRadius: signalGlass.radius.xl,
    borderTopWidth: 1,
    borderColor: signalGlass.colors.borderGlass,
    paddingHorizontal: signalGlass.spacing.marginMobile,
    paddingTop: signalGlass.spacing.md,
    maxHeight: '85%',
  },
  handle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: signalGlass.colors.outlineVariant,
    alignSelf: 'center',
    marginBottom: signalGlass.spacing.lg,
  },
  title: {
    ...signalGlass.typography.displayMd,
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.bodySemiBold,
    marginBottom: signalGlass.spacing.xs,
  },
  amountLabel: {
    ...signalGlass.typography.body,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.body,
    marginBottom: signalGlass.spacing.md,
  },
  list: { marginBottom: signalGlass.spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: signalGlass.spacing.md,
    borderRadius: signalGlass.radius.lg,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderGlass,
    backgroundColor: signalGlass.colors.bgGlass,
    marginBottom: signalGlass.spacing.sm,
  },
  optionActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: signalGlass.colors.primary,
    ...signalGlass.shadow.cardGlow,
  },
  optionDisabled: { opacity: 0.45 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: signalGlass.spacing.md, flex: 1 },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: signalGlass.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconActive: { backgroundColor: signalGlass.colors.accentPrimaryMuted },
  optionTitle: {
    ...signalGlass.typography.bodyLg,
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.body,
    fontSize: 16,
  },
  optionSub: {
    ...signalGlass.typography.body,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.body,
    fontSize: 14,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: signalGlass.colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: signalGlass.colors.primary },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: signalGlass.colors.primary,
  },
  notice: {
    fontSize: 12,
    color: signalGlass.colors.onSurfaceVariant,
    marginBottom: signalGlass.spacing.sm,
    lineHeight: 18,
  },
  gateway: {
    textAlign: 'center',
    fontSize: 11,
    color: signalGlass.colors.textMuted,
    marginBottom: signalGlass.spacing.sm,
  },
});
