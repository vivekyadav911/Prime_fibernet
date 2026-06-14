import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { PlanStats } from '@/types/plans';
import { formatINR } from '@/utils/planUtils';

type PlanStatsBarProps = {
  stats: PlanStats;
};

type StatCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  sub: string;
};

function StatCard({ icon, iconColor, label, value, sub }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.sub}>{sub}</Text>
    </View>
  );
}

export function PlanStatsBar({ stats }: PlanStatsBarProps) {
  return (
    <View style={styles.row}>
      <StatCard
        icon="grid-outline"
        iconColor="#6366F1"
        label="TOTAL PLANS"
        value={String(stats.totalPlans)}
        sub={`${stats.activePlansCount} active`}
      />
      <StatCard
        icon="pricetag-outline"
        iconColor="#F59E0B"
        label="AVG PRICE"
        value={formatINR(stats.avgPrice)}
        sub={`${formatINR(stats.priceRange.min)} - ${formatINR(stats.priceRange.max)}`}
      />
      <StatCard
        icon="speedometer-outline"
        iconColor="#10B981"
        label="AVG SPEED"
        value={`${stats.avgSpeedMbps} Mbps`}
        sub={`${stats.speedRange.min} - ${stats.speedRange.max} Mbps`}
      />
      <StatCard
        icon="trending-up-outline"
        iconColor="#8B5CF6"
        label="TOTAL REVENUE"
        value={formatINR(stats.totalPotentialMonthlyRevenue)}
        sub="Potential monthly"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    padding: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    gap: spacing.xxs,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sub: {
    fontSize: 10,
    color: colors.textSecondary,
  },
});
