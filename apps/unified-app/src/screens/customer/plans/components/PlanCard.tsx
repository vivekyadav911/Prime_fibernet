import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Plan } from '@prime/types';

import { colors, speedTierGradients } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { getSpeedTier } from '@/utils/planTier';

type PlanCardProps = {
  plan: Plan;
  isCurrentPlan?: boolean;
  onPress: () => void;
};

export const PlanCard = React.memo(function PlanCard({ plan, isCurrentPlan, onPress }: PlanCardProps) {
  const tier = getSpeedTier(plan.speedMbps);
  const gradient = speedTierGradients[tier];

  return (
    <Pressable style={styles.wrapper} onPress={onPress}>
      <LinearGradient colors={[...gradient]} style={styles.card}>
        {isCurrentPlan ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Your plan</Text>
          </View>
        ) : null}
        <Text style={styles.name}>{plan.name}</Text>
        <Text style={styles.speed}>{plan.speedMbps} Mbps</Text>
        <Text style={styles.price}>₹{plan.price}</Text>
        <Text style={styles.validity}>{plan.validityDays} days</Text>
      </LinearGradient>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrapper: { flex: 1, minWidth: '46%', maxWidth: '48%' },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 140,
    gap: spacing.xxs,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    marginBottom: spacing.xs,
  },
  badgeText: { color: colors.primaryNavy, fontSize: 10, fontWeight: '700' },
  name: { color: colors.white, fontWeight: '700', fontSize: 16 },
  speed: { color: colors.white, opacity: 0.9, fontSize: 13 },
  price: { color: colors.white, fontSize: 20, fontWeight: '700', marginTop: spacing.xs },
  validity: { color: colors.white, opacity: 0.85, fontSize: 12 },
});
