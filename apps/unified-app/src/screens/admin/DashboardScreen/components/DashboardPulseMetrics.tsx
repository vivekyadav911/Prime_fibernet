import { StyleSheet, Text, View } from 'react-native';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { formatINR } from '@/utils/planUtils';

type DashboardPulseMetricsProps = {
  mrr: number;
  activeSubscribers: number;
  revenueTrendPercent?: number;
};

function formatCompactINR(amount: number): string {
  if (!Number.isFinite(amount)) return '₹0';
  if (amount >= 100_000) {
    const lakhs = amount / 100_000;
    return `₹${lakhs >= 10 ? Math.round(lakhs) : lakhs.toFixed(1)}L`;
  }
  if (amount >= 1_000) {
    const thousands = amount / 1_000;
    return `₹${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1)}K`;
  }
  return formatINR(amount);
}

function formatCount(value: number): string {
  return value.toLocaleString('en-IN');
}

export function DashboardPulseMetrics({
  mrr,
  activeSubscribers,
  revenueTrendPercent,
}: DashboardPulseMetricsProps) {
  const trend =
    revenueTrendPercent == null
      ? null
      : revenueTrendPercent > 0
        ? `+${revenueTrendPercent}%`
        : `${revenueTrendPercent}%`;

  return (
    <View style={styles.row}>
      <View style={styles.metric}>
        <Text style={styles.label}>MRR</Text>
        <Text style={styles.value}>{formatCompactINR(mrr)}</Text>
        {trend ? (
          <Text
            style={[
              styles.trend,
              revenueTrendPercent! >= 0 ? styles.trendUp : styles.trendDown,
            ]}
          >
            {trend} MoM
          </Text>
        ) : null}
      </View>
      <View style={styles.divider} />
      <View style={styles.metric}>
        <Text style={styles.label}>Subscribers</Text>
        <Text style={styles.value}>{formatCount(activeSubscribers)}</Text>
        <Text style={styles.hint}>Active base</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: adminColors.dashboard.surfacePastel,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: adminColors.dashboard.panelBorder,
    overflow: 'hidden',
  },
  metric: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 0,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: adminColors.dashboard.panelBorder,
  },
  label: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
    lineHeight: 21,
    marginTop: 2,
  },
  trend: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  trendUp: { color: adminColors.badgeActive },
  trendDown: { color: adminColors.badgeBlocked },
  hint: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
});
