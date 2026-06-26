import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Plan } from '@prime/types';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { CustomerButton, GlassCard, PressableScale } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

type PlanCardProps = {
  plan: Plan;
  priceLabel: string;
  isCurrentPlan?: boolean;
  daysUntilRenewal?: number;
  onPress: (plan: Plan) => void;
  onChangePlan?: (plan: Plan) => void;
};

export const PlanCard = React.memo(function PlanCard({
  plan,
  priceLabel,
  isCurrentPlan,
  daysUntilRenewal,
  onPress,
  onChangePlan,
}: PlanCardProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();
  const tierLabel = plan.isFeatured ? 'PROFESSIONAL' : plan.speedMbps >= 500 ? 'ULTRA STREAM' : plan.speedMbps >= 200 ? 'PROFESSIONAL' : 'ESSENTIAL';
  const features = [
    plan.isUnlimited ? 'Unlimited Data' : plan.dataLimitGb ? `${plan.dataLimitGb} GB` : 'Unlimited Data',
    ...(plan.features?.slice(0, 2) ?? []),
  ].slice(0, 3);

  return (
    <PressableScale
      style={styles.wrapper}
      onPress={() => onPress(plan)}
      accessibilityLabel={`${plan.name}, ${plan.speedMbps} Mbps, ${priceLabel}`}
    >
      <GlassCard
        style={[styles.card, isCurrentPlan && styles.current]}
        glow={isCurrentPlan}
        padded
      >
        {isCurrentPlan ? (
          <View style={styles.currentBadge}>
            <View style={styles.currentDot} />
            <Text style={styles.currentBadgeText}>Current Plan</Text>
          </View>
        ) : null}

        <View style={styles.header}>
          <View>
            <View style={styles.speedRow}>
              <Text style={[styles.speed, isCurrentPlan && styles.speedActive]}>{plan.speedMbps}</Text>
              <Text style={styles.unit}>Mbps</Text>
            </View>
            <Text style={[styles.tier, isCurrentPlan && styles.tierActive]}>{tierLabel}</Text>
          </View>
          <MaterialCommunityIcons
            name={isCurrentPlan ? 'rocket-launch' : plan.speedMbps >= 500 ? 'lightning-bolt' : 'speedometer'}
            size={36}
            color={isCurrentPlan ? theme.colors.primary : theme.colors.outline}
          />
        </View>

        <Text style={styles.price}>
          {priceLabel}
          <Text style={styles.priceSuffix}>/mo</Text>
        </Text>

        <View style={styles.tags}>
          {features.map((tag) => (
            <View key={tag} style={[styles.tag, isCurrentPlan && styles.tagActive]}>
              <Text style={[styles.tagText, isCurrentPlan && styles.tagTextActive]}>{tag}</Text>
            </View>
          ))}
        </View>

        {isCurrentPlan ? (
          <View style={styles.footerActive}>
            <View style={styles.activeRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color={theme.colors.secondary} />
              <Text style={styles.activeLabel}>Active</Text>
            </View>
            {daysUntilRenewal != null ? (
              <Text style={styles.renewal}>Renews in {daysUntilRenewal}d</Text>
            ) : null}
          </View>
        ) : (
          <CustomerButton
            label="Change Plan"
            variant={plan.isFeatured ? 'primary' : 'outline'}
            onPress={() => (onChangePlan ? onChangePlan(plan) : onPress(plan))}
            style={styles.changeBtn}
          />
        )}
      </GlassCard>
    </PressableScale>
  );
});

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    wrapper: { marginBottom: theme.spacing.sm },
    card: {
      borderRadius: theme.radius.lg,
      minHeight: 220,
    },
    current: {
      borderColor: theme.colors.primary,
      borderWidth: 1,
    },
    currentBadge: {
      position: 'absolute',
      top: -12,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.accentPrimaryMuted,
      borderWidth: 1,
      borderColor: 'rgba(173,198,255,0.5)',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.radius.pill,
    },
    currentDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.secondary,
    },
    currentBadgeText: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      fontFamily: theme.fonts.bodyMedium,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    speedRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    speed: {
      fontSize: 40,
      fontWeight: '600',
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.monoBold,
    },
    speedActive: {
      fontSize: 48,
      color: theme.colors.primary,
    },
    unit: {
      ...theme.typography.monoMd,
      color: theme.colors.primary,
      fontFamily: theme.fonts.mono,
    },
    tier: {
      ...theme.typography.label,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.bodyMedium,
      marginTop: 4,
    },
    tierActive: { color: theme.colors.primary },
    price: {
      ...theme.typography.mono,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.monoBold,
      marginBottom: theme.spacing.md,
    },
    priceSuffix: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
    },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginBottom: theme.spacing.lg },
    tag: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceContainerHigh,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    tagActive: {
      backgroundColor: theme.colors.accentPrimaryMuted,
      borderColor: 'rgba(173,198,255,0.2)',
    },
    tagText: {
      ...theme.typography.caption,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.bodyMedium,
    },
    tagTextActive: { color: theme.colors.primary },
    footerActive: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: 'rgba(173,198,255,0.2)',
      paddingTop: theme.spacing.sm,
    },
    activeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    activeLabel: {
      ...theme.typography.caption,
      color: theme.colors.secondary,
      fontFamily: theme.fonts.bodyMedium,
    },
    renewal: {
      ...theme.typography.monoMd,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.mono,
    },
    changeBtn: { marginTop: 'auto' },
  });
