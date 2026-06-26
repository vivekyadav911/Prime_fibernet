import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Plan } from '@prime/types';

import { CustomerButton, GlassCard, PressableScale } from '@/components/customer/ui';
import { signalGlass } from '@/theme/customer/signalGlass';

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
            color={isCurrentPlan ? signalGlass.colors.primary : signalGlass.colors.outline}
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
              <MaterialCommunityIcons name="check-circle" size={16} color={signalGlass.colors.secondary} />
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

const styles = StyleSheet.create({
  wrapper: { marginBottom: signalGlass.spacing.sm },
  card: {
    borderRadius: signalGlass.radius.lg,
    minHeight: 220,
  },
  current: {
    borderColor: signalGlass.colors.primary,
    borderWidth: 1,
  },
  currentBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: signalGlass.colors.accentPrimaryMuted,
    borderWidth: 1,
    borderColor: 'rgba(173,198,255,0.5)',
    paddingHorizontal: signalGlass.spacing.sm,
    paddingVertical: 4,
    borderRadius: signalGlass.radius.pill,
  },
  currentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: signalGlass.colors.secondary,
  },
  currentBadgeText: {
    ...signalGlass.typography.caption,
    color: signalGlass.colors.primary,
    fontFamily: signalGlass.fonts.bodyMedium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: signalGlass.spacing.sm,
    marginBottom: signalGlass.spacing.md,
  },
  speedRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  speed: {
    fontSize: 40,
    fontWeight: '600',
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.monoBold,
  },
  speedActive: {
    fontSize: 48,
    color: signalGlass.colors.primary,
  },
  unit: {
    ...signalGlass.typography.monoMd,
    color: signalGlass.colors.primary,
    fontFamily: signalGlass.fonts.mono,
  },
  tier: {
    ...signalGlass.typography.label,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.bodyMedium,
    marginTop: 4,
  },
  tierActive: { color: signalGlass.colors.primary },
  price: {
    ...signalGlass.typography.mono,
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.monoBold,
    marginBottom: signalGlass.spacing.md,
  },
  priceSuffix: {
    ...signalGlass.typography.body,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.body,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: signalGlass.spacing.xs, marginBottom: signalGlass.spacing.lg },
  tag: {
    paddingHorizontal: signalGlass.spacing.sm,
    paddingVertical: 4,
    borderRadius: signalGlass.radius.pill,
    backgroundColor: signalGlass.colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tagActive: {
    backgroundColor: signalGlass.colors.accentPrimaryMuted,
    borderColor: 'rgba(173,198,255,0.2)',
  },
  tagText: {
    ...signalGlass.typography.caption,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.bodyMedium,
  },
  tagTextActive: { color: signalGlass.colors.primary },
  footerActive: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(173,198,255,0.2)',
    paddingTop: signalGlass.spacing.sm,
  },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  activeLabel: {
    ...signalGlass.typography.caption,
    color: signalGlass.colors.secondary,
    fontFamily: signalGlass.fonts.bodyMedium,
  },
  renewal: {
    ...signalGlass.typography.monoMd,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.mono,
  },
  changeBtn: { marginTop: 'auto' },
});
