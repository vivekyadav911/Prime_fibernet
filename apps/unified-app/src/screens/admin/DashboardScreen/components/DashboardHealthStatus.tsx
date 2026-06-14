import { StyleSheet, Text, View } from 'react-native';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export type NetworkHealth = 'healthy' | 'attention' | 'critical';

type DashboardHealthStatusProps = {
  health: NetworkHealth;
  attentionCount: number;
};

const HEALTH_CONFIG: Record<
  NetworkHealth,
  { label: string; detail: string; dot: string; bg: string; border: string }
> = {
  healthy: {
    label: 'All systems normal',
    detail: 'No urgent actions',
    dot: adminColors.badgeActive,
    bg: adminColors.dashboard.kpiTrendUpBg,
    border: adminColors.dashboard.kpiTrendUpBorder,
  },
  attention: {
    label: 'Needs attention',
    detail: 'Review action items',
    dot: adminColors.badgePending,
    bg: adminColors.dashboard.actionWarningBg,
    border: adminColors.dashboard.kpiUrgentBorder,
  },
  critical: {
    label: 'Critical items',
    detail: 'Act immediately',
    dot: adminColors.badgeBlocked,
    bg: adminColors.dashboard.actionCriticalBg,
    border: adminColors.dashboard.kpiTrendDownBorder,
  },
};

export function DashboardHealthStatus({ health, attentionCount }: DashboardHealthStatusProps) {
  const config = HEALTH_CONFIG[health];

  return (
    <View style={[styles.banner, { backgroundColor: config.bg, borderColor: config.border }]}>
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <View style={styles.copy}>
        <Text style={styles.label}>{config.label}</Text>
        <Text style={styles.detail}>
          {health === 'healthy' ? config.detail : `${attentionCount} item${attentionCount === 1 ? '' : 's'} waiting`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flex: 1,
    minWidth: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  detail: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 1,
  },
});
