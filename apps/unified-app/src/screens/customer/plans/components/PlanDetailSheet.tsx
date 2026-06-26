import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetHandle,
  type BottomSheetBackdropProps,
  type BottomSheetHandleProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { BillingCycle, Plan } from '@prime/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomerButton } from '@/components/customer/ui';
import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';
import { formatCurrencyInr } from '@/utils/formatCurrency';

type PlanDetailSheetProps = {
  plan: Plan | null;
  price: number;
  billingCycle: BillingCycle;
  isCurrentPlan?: boolean;
  subscribing?: boolean;
  onSubscribe: () => void;
  onPlanChange: () => void;
};

export const PlanDetailSheet = forwardRef<BottomSheet, PlanDetailSheetProps>(
  function PlanDetailSheet(
    { plan, price, billingCycle, isCurrentPlan, subscribing, onSubscribe, onPlanChange },
    ref,
  ) {
    const insets = useSafeAreaInsets();
    const { theme } = useCustomerTheme();
    const styles = useThemedStyles(createStyles);
    const snapPoints = useMemo(() => ['60%'], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      [],
    );

    const renderHandle = useCallback(
      (props: BottomSheetHandleProps) => (
        <BottomSheetHandle {...props} indicatorStyle={styles.handleIndicator} />
      ),
      [styles.handleIndicator],
    );

    if (!plan) return null;

    const monthly = plan.price;
    const annualSavings = monthly * 12 - (plan.priceAnnual ?? monthly * 10);

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        backdropComponent={renderBackdrop}
        handleComponent={renderHandle}
        backgroundStyle={styles.sheetBg}
      >
        <View style={[styles.content, { paddingBottom: insets.bottom + theme.spacing.lg }]}>
          <Text style={styles.name}>{plan.name}</Text>
          <Text style={styles.meta}>
            {plan.speedMbps} Mbps · {billingCycle} billing
          </Text>
          <Text style={styles.price}>{formatCurrencyInr(price)}</Text>
          {billingCycle === 'annual' && annualSavings > 0 ? (
            <Text style={styles.savings}>Save {formatCurrencyInr(annualSavings)}/year</Text>
          ) : null}
          {plan.features.map((feature) => (
            <Text key={feature} style={styles.feature}>
              ✓ {feature}
            </Text>
          ))}
          {!isCurrentPlan ? (
            <>
              <CustomerButton
                label={subscribing ? 'Processing…' : `Subscribe for ${formatCurrencyInr(price)}`}
                onPress={onSubscribe}
                style={styles.cta}
              />
              <CustomerButton label="Request plan change" variant="ghost" onPress={onPlanChange} />
            </>
          ) : (
            <Text style={styles.currentNote}>This is your current plan</Text>
          )}
        </View>
      </BottomSheet>
    );
  },
);

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    sheetBg: { backgroundColor: theme.colors.bgSurface },
    handleIndicator: { backgroundColor: theme.colors.textMuted, width: 40 },
    content: { padding: theme.spacing.lg, gap: theme.spacing.xs },
    name: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.display,
    },
    meta: { color: theme.colors.textSecondary, fontSize: 14 },
    price: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.accentPrimary,
      fontFamily: theme.fonts.mono,
      marginVertical: theme.spacing.sm,
    },
    savings: { color: theme.colors.accentSuccess, fontSize: 13, fontWeight: '600' },
    feature: { color: theme.colors.textSecondary, fontSize: 14 },
    cta: { marginTop: theme.spacing.lg },
    currentNote: {
      marginTop: theme.spacing.lg,
      color: theme.colors.accentSuccess,
      fontWeight: '600',
    },
  });
