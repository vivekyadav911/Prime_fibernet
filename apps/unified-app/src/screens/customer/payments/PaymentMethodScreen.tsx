import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { CustomerButton } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { formatINR } from '@/utils/currencyFormat';
import { PAYMENT_METHOD_CONFIG, type PaymentMethod } from '@/types/payments';
import { useGetActivePaymentGatewayQuery } from '@/services/api/paymentCollectionApi';
import type { CustomerStackParamList } from '@/types/navigation';
import type { CustomerTheme } from '@/theme/customer';

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
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();

  const gatewayReady = Boolean(activeGateway);

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={() => navigation.goBack()} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }]}>
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
                      color={active ? theme.colors.primary : theme.colors.onSurfaceVariant}
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

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: theme.colors.overlay,
    },
    backdrop: { ...StyleSheet.absoluteFillObject },
    sheet: {
      backgroundColor: theme.colors.surfaceContainer,
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      borderTopWidth: 1,
      borderColor: theme.colors.borderGlass,
      paddingHorizontal: theme.spacing.marginMobile,
      paddingTop: theme.spacing.md,
      maxHeight: '85%',
    },
    handle: {
      width: 48,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.outlineVariant,
      alignSelf: 'center',
      marginBottom: theme.spacing.lg,
    },
    title: {
      ...theme.typography.displayMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
      marginBottom: theme.spacing.xs,
    },
    amountLabel: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      marginBottom: theme.spacing.md,
    },
    list: { marginBottom: theme.spacing.md },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      backgroundColor: theme.colors.bgGlass,
      marginBottom: theme.spacing.sm,
    },
    optionActive: {
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderColor: theme.colors.primary,
      ...theme.shadow.cardGlow,
    },
    optionDisabled: { opacity: 0.45 },
    optionLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, flex: 1 },
    optionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionIconActive: { backgroundColor: theme.colors.accentPrimaryMuted },
    optionTitle: {
      ...theme.typography.bodyLg,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.body,
      fontSize: 16,
    },
    optionSub: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      fontSize: 14,
    },
    radio: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.outlineVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioActive: { borderColor: theme.colors.primary },
    radioDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.primary,
    },
    notice: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      marginBottom: theme.spacing.sm,
      lineHeight: 18,
    },
    gateway: {
      textAlign: 'center',
      fontSize: 11,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.sm,
    },
  });
