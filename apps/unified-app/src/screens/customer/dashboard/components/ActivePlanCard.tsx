import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@prime/ui';
import type { Subscription } from '@prime/types';

import { StatusChip } from '@/components/common';
import { colors, speedTierGradients } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { getSpeedTier } from '@/utils/planTier';

type ActivePlanCardProps = {
  subscription: Subscription;
  speedMbps?: number;
  onChangePlan?: () => void;
};

export function ActivePlanCard({ subscription, speedMbps = 100, onChangePlan }: ActivePlanCardProps) {
  const tier = getSpeedTier(speedMbps);
  const gradient = speedTierGradients[tier];
  const expiringSoon = (subscription.daysUntilExpiry ?? 99) <= 7;

  return (
    <LinearGradient colors={[...gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>Current plan</Text>
          <Text style={styles.planName}>{subscription.planName ?? 'Active plan'}</Text>
        </View>
        <StatusChip status={expiringSoon ? 'pending' : 'active'} />
      </View>
      <Text style={styles.meta}>
        Valid until {new Date(subscription.endAt).toLocaleDateString()}
      </Text>
      {onChangePlan ? (
        <Button label="Change plan" variant="secondary" onPress={onChangePlan} style={styles.button} />
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  label: { color: colors.white, opacity: 0.85, fontSize: 12 },
  planName: { color: colors.white, fontSize: 22, fontWeight: '700', marginTop: spacing.xxs },
  meta: { color: colors.white, opacity: 0.9, fontSize: 14 },
  button: { marginTop: spacing.sm },
});
