import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Plan } from '@prime/types';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { CustomerStatusPill, GlassCard, PressableScale } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';
import { getPlanDataLabel, getPlanTierLabel } from '@/utils/planDisplay';
import { planChangeCtaLabel, type PlanChangeDirection } from '@/utils/planChange';

type PlanCardProps = {
  plan: Plan;
  priceLabel: string;
  isCurrentPlan?: boolean;
  changeDirection?: PlanChangeDirection;
  daysUntilRenewal?: number;
  onPress: (plan: Plan) => void;
};

export const PlanCard = React.memo(function PlanCard({
  plan,
  priceLabel,
  isCurrentPlan,
  changeDirection = 'switch',
  daysUntilRenewal,
  onPress,
}: PlanCardProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();
  const tierLabel = getPlanTierLabel(plan.speedMbps, plan.isFeatured);
  const dataLabel = getPlanDataLabel(plan);
  const ctaLabel = isCurrentPlan ? 'Current plan' : planChangeCtaLabel(changeDirection);

  return (
    <PressableScale
      style={styles.wrapper}
      onPress={() => onPress(plan)}
      accessibilityLabel={`${plan.speedMbps} Mbps ${tierLabel}, ${priceLabel}, ${ctaLabel}`}
    >
      <GlassCard
        style={[styles.card, isCurrentPlan && styles.current]}
        glow={isCurrentPlan}
        padded
        contentStyle={styles.cardContent}
      >
        <View style={styles.topRow}>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons name="rocket-launch" size={20} color={theme.colors.primary} />
            <Text style={styles.speedTitle} numberOfLines={2}>
              {plan.speedMbps} Mbps {tierLabel}
            </Text>
          </View>
          {isCurrentPlan ? (
            <CustomerStatusPill label="Current plan" tone="current" style={styles.currentPill} />
          ) : null}
        </View>

        <Text style={styles.meta} numberOfLines={1}>
          {priceLabel}/mo · {dataLabel}
        </Text>

        <View style={styles.footer}>
          {isCurrentPlan && daysUntilRenewal != null ? (
            <Text style={styles.renewal}>Renews in {daysUntilRenewal}d</Text>
          ) : (
            <Text style={[styles.ctaHint, changeDirection === 'upgrade' && styles.ctaUpgrade]} numberOfLines={1}>
              {ctaLabel}
            </Text>
          )}
          <View style={styles.expandHint}>
            <Text style={styles.expandText}>View details</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.primary} />
          </View>
        </View>
      </GlassCard>
    </PressableScale>
  );
});

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    wrapper: { marginBottom: theme.spacing.sm },
    card: {
      borderRadius: theme.radius.lg,
    },
    cardContent: {
      gap: theme.spacing.sm,
    },
    current: {
      borderColor: theme.colors.primary,
      borderWidth: 1,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.xs,
      flex: 1,
      minWidth: 0,
    },
    currentPill: {
      flexShrink: 0,
      maxWidth: '46%',
    },
    speedTitle: {
      ...theme.typography.bodyLg,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
      fontWeight: '600',
      flex: 1,
    },
    meta: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    renewal: {
      ...theme.typography.caption,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.mono,
    },
    ctaHint: {
      ...theme.typography.caption,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.bodyMedium,
      fontWeight: '600',
    },
    ctaUpgrade: {
      color: theme.colors.primary,
    },
    expandHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      marginLeft: 'auto',
    },
    expandText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      fontFamily: theme.fonts.bodyMedium,
    },
  });
