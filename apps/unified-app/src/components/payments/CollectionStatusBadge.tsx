import { colors } from '@/theme/colors';
import { adminColors } from '@/theme/admin';
import type { CollectionStatus } from '@/types/payments';
import { StyleSheet, Text, View } from 'react-native';
import { radius, spacing } from '@/theme/spacing';

const STATUS_CONFIG: Record<
  CollectionStatus,
  { label: string; bg: string; text: string }
> = {
  inactive: { label: 'NOT IN POOL', bg: colors.background, text: colors.textSecondary },
  open: { label: 'OPEN', bg: '#EFF6FF', text: colors.primaryNavy },
  assigned: { label: 'ASSIGNED', bg: adminColors.navPillWarningBg, text: adminColors.navPillWarningText },
  claimed: { label: 'CLAIMED', bg: '#F3E8FF', text: adminColors.primary },
  collected: { label: 'COLLECTED', bg: adminColors.navPillSuccessBg, text: adminColors.navPillSuccessText },
  failed: { label: 'FAILED', bg: adminColors.navPillDangerBg, text: adminColors.navPillDangerText },
};

type CollectionStatusBadgeProps = {
  status: CollectionStatus | string | null | undefined;
};

export function CollectionStatusBadge({ status }: CollectionStatusBadgeProps) {
  const key = (status ?? 'open') as CollectionStatus;
  const config = STATUS_CONFIG[key] ?? STATUS_CONFIG.open;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
