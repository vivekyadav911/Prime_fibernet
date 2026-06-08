import BottomSheet, { BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@prime/ui';
import type { Plan } from '@prime/types';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type PlanDetailSheetProps = {
  plan: Plan | null;
  isCurrentPlan?: boolean;
  subscribing?: boolean;
  onSubscribe: () => void;
};

export const PlanDetailSheet = forwardRef<BottomSheet, PlanDetailSheetProps>(
  function PlanDetailSheet({ plan, isCurrentPlan, subscribing, onSubscribe }, ref) {
    const snapPoints = useMemo(() => ['55%'], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      [],
    );

    if (!plan) return null;

    return (
      <BottomSheet ref={ref} index={-1} snapPoints={snapPoints} enablePanDownToClose backdropComponent={renderBackdrop}>
        <View style={styles.content}>
          <Text style={styles.name}>{plan.name}</Text>
          <Text style={styles.meta}>
            {plan.speedMbps} Mbps · {plan.validityDays} days validity
          </Text>
          <Text style={styles.price}>₹{plan.price}</Text>
          {plan.features.map((feature) => (
            <Text key={feature} style={styles.feature}>
              ✓ {feature}
            </Text>
          ))}
          {!isCurrentPlan ? (
            <Button
              label={subscribing ? 'Processing…' : 'Subscribe'}
              onPress={onSubscribe}
              style={styles.cta}
            />
          ) : (
            <Text style={styles.currentNote}>This is your current plan</Text>
          )}
        </View>
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xs },
  name: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  meta: { color: colors.textSecondary, fontSize: 14 },
  price: { fontSize: 28, fontWeight: '700', color: colors.primaryNavy, marginVertical: spacing.sm },
  feature: { color: colors.textSecondary, fontSize: 14 },
  cta: { marginTop: spacing.lg },
  currentNote: { marginTop: spacing.lg, color: colors.successGreen, fontWeight: '600' },
});
