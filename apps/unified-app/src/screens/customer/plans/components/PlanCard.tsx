import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Plan } from '@prime/types';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { GlassCard, PressableScale } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';
import { getPlanDataLabel, getPlanTierLabel } from '@/utils/planDisplay';

type PlanCardProps = {
  plan: Plan;
  priceLabel: string;
  isCurrentPlan?: boolean;
  daysUntilRenewal?: number;
  onPress: (plan: Plan) => void;
};

export const PlanCard = React.memo(function PlanCard({
  plan,
  priceLabel,
  isCurrentPlan,
  daysUntilRenewal,
  onPress,
}: PlanCardProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();
  const tierLabel = getPlanTierLabel(plan.speedMbps, plan.isFeatured);
  const dataLabel = getPlanDataLabel(plan);

  return (
    <PressableScale
      style={styles.wrapper}
      onPress={() => onPress(plan)}
      accessibilityLabel={`${plan.speedMbps} Mbps ${tierLabel}, ${priceLabel}`}
    >
      <GlassCard style={[styles.card, isCurrentPlan && styles.current]} glow={isCurrentPlan} padded>
        <View style={styles.topRow}>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons name="rocket-launch" size={20} color={theme.colors.primary} />
            <Text style={styles.speedTitle}>
              {plan.speedMbps} Mbps {tierLabel}
            </Text>
          </View>
          {isCurrentPlan ? (
            <View style={styles.currentBadge}>
              <View style={styles.currentDot} />
              <Text style={styles.currentBadgeText}>Current Plan</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.meta}>
          {priceLabel}/mo · {dataLabel}
        </Text>

        <View style={styles.footer}>
          {isCurrentPlan && daysUntilRenewal != null ? (
            <Text style={styles.renewal}>Renews in {daysUntilRenewal}d</Text>
          ) : (
            <View />
          )}
          <View style={styles.expandHint}>
            <Text style={styles.expandText}>Tap to expand</Text>
            <MaterialCommunityIcons name="chevron-down" size={18} color={theme.colors.primary} />
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
      minHeight: 168,
      maxHeight: 180,
      justifyContent: 'space-between',
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
      alignItems: 'center',
      gap: theme.spacing.xs,
      flex: 1,
      minWidth: 0,
    },
    speedTitle: {
      ...theme.typography.bodyLg,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
      flexShrink: 1,
    },
    currentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.accentPrimaryMuted,
      borderWidth: 1,
      borderColor: 'rgba(173,198,255,0.3)',
    },
    currentDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.secondary,
    },
    currentBadgeText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      fontFamily: theme.fonts.bodyMedium,
      fontSize: 10,
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
