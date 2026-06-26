import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Plan } from '@prime/types';

import { CustomerBadge, PressableScale } from '@/components/customer/ui';
import { signalGlass } from '@/theme/customer/signalGlass';

type PlanCardProps = {
  plan: Plan;
  priceLabel: string;
  isCurrentPlan?: boolean;
  isFeatured?: boolean;
  onPress: (plan: Plan) => void;
};

export const PlanCard = React.memo(function PlanCard({
  plan,
  priceLabel,
  isCurrentPlan,
  isFeatured,
  onPress,
}: PlanCardProps) {
  return (
    <PressableScale
      style={styles.wrapper}
      onPress={() => onPress(plan)}
      accessibilityLabel={`${plan.name}, ${plan.speedMbps} Mbps, ${priceLabel}`}
    >
      <View style={[styles.card, isCurrentPlan && styles.current]}>
        {isFeatured ? (
          <CustomerBadge label="Featured" tone="info" style={styles.featured} />
        ) : null}
        {isCurrentPlan ? <CustomerBadge label="Current Plan" tone="success" style={styles.featured} /> : null}
        <Text style={styles.speed}>{plan.speedMbps}</Text>
        <Text style={styles.unit}>Mbps</Text>
        <Text style={styles.limit} numberOfLines={1}>
          {plan.isUnlimited ? 'UNLIMITED' : plan.dataLimitGb ? `${plan.dataLimitGb} GB` : 'Unlimited'}
        </Text>
        <Text style={styles.price} numberOfLines={1}>
          {priceLabel}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {plan.name}
        </Text>
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  wrapper: { flex: 1, minWidth: '46%', maxWidth: '48%', marginBottom: signalGlass.spacing.sm },
  card: {
    borderRadius: signalGlass.radius.md,
    padding: signalGlass.spacing.md,
    minHeight: 150,
    backgroundColor: signalGlass.colors.bgSurface,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
  },
  current: { borderColor: signalGlass.colors.accentPrimary },
  featured: { marginBottom: signalGlass.spacing.xs },
  speed: {
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.monoBold,
    fontSize: 28,
    fontWeight: '700',
  },
  unit: {
    color: signalGlass.colors.accentGlow,
    fontFamily: signalGlass.fonts.mono,
    fontSize: 12,
  },
  limit: {
    color: signalGlass.colors.textSecondary,
    fontSize: 11,
    marginTop: signalGlass.spacing.xs,
    textTransform: 'uppercase',
  },
  price: {
    color: signalGlass.colors.accentPrimary,
    fontFamily: signalGlass.fonts.mono,
    fontSize: 16,
    marginTop: signalGlass.spacing.sm,
  },
  name: {
    color: signalGlass.colors.textSecondary,
    fontSize: 13,
    marginTop: signalGlass.spacing.xs,
  },
});
