import BottomSheet, { BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { BillingCycle, Plan } from '@prime/types';

import { CustomerButton } from '@/components/customer/ui';
import { signalGlass } from '@/theme/customer/signalGlass';
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
    const snapPoints = useMemo(() => ['60%'], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      [],
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
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBg}
      >
        <View style={styles.content}>
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
                label={subscribing ? 'Processing…' : 'Subscribe now'}
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

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: signalGlass.colors.bgSurface },
  content: { padding: signalGlass.spacing.lg, gap: signalGlass.spacing.xs },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.display,
  },
  meta: { color: signalGlass.colors.textSecondary, fontSize: 14 },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: signalGlass.colors.accentPrimary,
    fontFamily: signalGlass.fonts.mono,
    marginVertical: signalGlass.spacing.sm,
  },
  savings: { color: signalGlass.colors.accentSuccess, fontSize: 13, fontWeight: '600' },
  feature: { color: signalGlass.colors.textSecondary, fontSize: 14 },
  cta: { marginTop: signalGlass.spacing.lg },
  currentNote: {
    marginTop: signalGlass.spacing.lg,
    color: signalGlass.colors.accentSuccess,
    fontWeight: '600',
  },
});
