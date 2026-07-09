import { useCallback, useEffect, useState } from 'react';
import { Keyboard, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomerButton, CustomerInput } from '@/components/customer/ui';
import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CreateOrderPayload } from '@/types/payments';
import type { CustomerTheme } from '@/theme/customer';
import { formatINR } from '@/utils/currencyFormat';

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 50_000;

export type CustomerPaySheetIntent = Extract<CreateOrderPayload['intent'], 'advance' | 'custom'>;

export type CustomerPaySheetSubmit = {
  amount: number;
  intent: CustomerPaySheetIntent;
};

type CustomerPaySheetProps = {
  visible: boolean;
  planAmount: number;
  planName?: string | null;
  loading?: boolean;
  onClose: () => void;
  onPay: (payload: CustomerPaySheetSubmit) => void;
};

function parseAmountInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

export function CustomerPaySheet({
  visible,
  planAmount,
  planName,
  loading = false,
  onClose,
  onPay,
}: CustomerPaySheetProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useCustomerTheme();
  const styles = useThemedStyles(createStyles);
  const [mode, setMode] = useState<CustomerPaySheetIntent>('advance');
  const [customAmount, setCustomAmount] = useState('');
  const [amountError, setAmountError] = useState<string | undefined>();

  const reset = useCallback(() => {
    setMode('advance');
    setCustomAmount('');
    setAmountError(undefined);
  }, []);

  useEffect(() => {
    if (!visible) reset();
  }, [reset, visible]);

  const onDismiss = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const validateCustomAmount = (value: number | null): string | undefined => {
    if (value == null) return 'Enter an amount';
    if (value < MIN_AMOUNT) return `Minimum amount is ${formatINR(MIN_AMOUNT)}`;
    if (value > MAX_AMOUNT) return `Maximum amount is ${formatINR(MAX_AMOUNT)}`;
    return undefined;
  };

  const onContinue = () => {
    if (mode === 'advance') {
      if (planAmount < MIN_AMOUNT) {
        setAmountError('Plan amount is not available. Use a custom amount.');
        setMode('custom');
        return;
      }
      onPay({ amount: planAmount, intent: 'advance' });
      return;
    }

    const parsed = parseAmountInput(customAmount);
    const error = validateCustomAmount(parsed);
    if (error || parsed == null) {
      setAmountError(error);
      return;
    }
    onPay({ amount: parsed, intent: 'custom' });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable
        style={[
          styles.backdrop,
          {
            paddingTop: insets.top + theme.spacing.md,
            paddingBottom: insets.bottom + theme.spacing.md,
          },
        ]}
        onPress={() => {
          Keyboard.dismiss();
          onDismiss();
        }}
        accessibilityLabel="Dismiss"
      >
        <Pressable
          style={styles.card}
          onPress={(event) => event.stopPropagation()}
          accessibilityViewIsModal
        >
          <View style={styles.header}>
            <Text style={styles.title}>Pay via Razorpay</Text>
            <Pressable onPress={onDismiss} hitSlop={8} accessibilityLabel="Close" disabled={loading}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.content}>
            <Text style={styles.subtitle}>
              Pay for your next billing cycle or enter a custom amount. The amount you enter is the final charge.
            </Text>

            <View style={styles.options}>
              <Pressable
                style={[styles.option, mode === 'advance' && styles.optionSelected]}
                onPress={() => {
                  setMode('advance');
                  setAmountError(undefined);
                }}
                disabled={loading}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === 'advance' }}
              >
                <Text style={[styles.optionTitle, mode === 'advance' && styles.optionTitleSelected]}>
                  Next billing cycle
                </Text>
                <Text style={[styles.optionAmount, mode === 'advance' && styles.optionAmountSelected]}>
                  {formatINR(planAmount)}
                </Text>
                {planName ? <Text style={styles.optionMeta}>{planName}</Text> : null}
              </Pressable>

              <Pressable
                style={[styles.option, mode === 'custom' && styles.optionSelected]}
                onPress={() => {
                  setMode('custom');
                  setAmountError(undefined);
                }}
                disabled={loading}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === 'custom' }}
              >
                <Text style={[styles.optionTitle, mode === 'custom' && styles.optionTitleSelected]}>
                  Custom amount
                </Text>
                <Text style={styles.optionMeta}>Top-up or pay any amount</Text>
              </Pressable>
            </View>

            {mode === 'custom' ? (
              <CustomerInput
                label="Amount (INR)"
                value={customAmount}
                onChangeText={(text) => {
                  setCustomAmount(text.replace(/[^\d.]/g, ''));
                  setAmountError(undefined);
                }}
                keyboardType="decimal-pad"
                placeholder="e.g. 500"
                error={amountError}
                editable={!loading}
              />
            ) : null}

            {mode === 'advance' && amountError ? (
              <Text style={styles.inlineError}>{amountError}</Text>
            ) : null}

            <CustomerButton
              label={loading ? 'Starting checkout…' : 'Continue to Razorpay'}
              icon="credit-card-outline"
              onPress={onContinue}
              disabled={loading}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSubtle,
    },
    title: {
      ...theme.typography.bodyLg,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
      fontWeight: '700',
    },
    close: {
      color: theme.colors.primary,
      fontFamily: theme.fonts.bodyMedium,
      fontSize: 14,
    },
    content: {
      paddingTop: theme.spacing.md,
      gap: theme.spacing.md,
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    options: {
      gap: theme.spacing.sm,
    },
    option: {
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surfaceContainerLow,
      gap: theme.spacing.xs,
    },
    optionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.accentPrimaryMuted,
    },
    optionTitle: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
      fontWeight: '600',
    },
    optionTitleSelected: {
      color: theme.colors.primary,
    },
    optionAmount: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.monoBold,
    },
    optionAmountSelected: {
      color: theme.colors.primary,
    },
    optionMeta: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.body,
    },
    inlineError: {
      color: theme.colors.accentDanger,
      fontFamily: theme.fonts.body,
      fontSize: 13,
    },
  });
