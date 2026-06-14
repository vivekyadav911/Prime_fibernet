import { StyleSheet, Text, View } from 'react-native';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { formatINR } from '@/utils/planUtils';

type DashboardKpiSectionProps = {
  activeSubscribers: number;
  mrr: number;
  openRequests: number;
  officersOnline: number;
  revenueTrendPercent?: number;
};

type KpiHealth = 'healthy' | 'attention' | 'neutral';

type SecondaryKpi = {
  label: string;
  value: string;
  hint: string;
  health: KpiHealth;
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

function formatMrrHint(trend?: number): { text: string; tone: 'up' | 'down' | 'flat' } {
  if (trend == null) return { text: 'Revenue steady', tone: 'flat' };
  if (trend > 0) return { text: `+${trend}% MoM`, tone: 'up' };
  if (trend < 0) return { text: `${trend}% MoM`, tone: 'down' };
  return { text: 'Flat MoM', tone: 'flat' };
}

const HEALTH_HINT: Record<KpiHealth, { color: string }> = {
  healthy: { color: adminColors.badgeActive },
  attention: { color: adminColors.badgePending },
  neutral: { color: colors.textSecondary },
};

function PrimaryMrrCard({ mrr, revenueTrendPercent }: { mrr: number; revenueTrendPercent?: number }) {
  const hint = formatMrrHint(revenueTrendPercent);

  return (
    <View style={styles.primaryCard}>
      <View style={styles.primaryHeader}>
        <View>
          <Text style={styles.primaryEyebrow}>Primary metric</Text>
          <Text style={styles.primaryLabel}>Monthly recurring revenue</Text>
        </View>
        <View
          style={[
            styles.hintPill,
            hint.tone === 'up' && styles.hintPillUp,
            hint.tone === 'down' && styles.hintPillDown,
            hint.tone === 'flat' && styles.hintPillFlat,
          ]}
        >
          <Text
            style={[
              styles.hintPillText,
              hint.tone === 'up' && styles.hintTextUp,
              hint.tone === 'down' && styles.hintTextDown,
              hint.tone === 'flat' && styles.hintTextFlat,
            ]}
          >
            {hint.text}
          </Text>
        </View>
      </View>
      <Text style={styles.primaryValue}>{formatCompactINR(mrr)}</Text>
    </View>
  );
}

function SecondaryKpiCard({ kpi }: { kpi: SecondaryKpi }) {
  const hintColor = HEALTH_HINT[kpi.health].color;
  const isUrgent = kpi.health === 'attention';

  return (
    <View style={[styles.secondaryCard, isUrgent && styles.secondaryCardUrgent]}>
      <Text style={styles.secondaryLabel} numberOfLines={1}>
        {kpi.label}
      </Text>
      <Text style={[styles.secondaryValue, isUrgent && styles.secondaryValueUrgent]}>{kpi.value}</Text>
      <Text style={[styles.secondaryHint, { color: hintColor }]} numberOfLines={1}>
        {kpi.hint}
      </Text>
    </View>
  );
}

export function DashboardKpiSection({
  activeSubscribers,
  mrr,
  openRequests,
  officersOnline,
  revenueTrendPercent,
}: DashboardKpiSectionProps) {
  const secondaryKpis: SecondaryKpi[] = [
    {
      label: 'Subscribers',
      value: formatCount(activeSubscribers),
      hint: activeSubscribers > 0 ? 'Active base' : 'No active subs',
      health: activeSubscribers > 0 ? 'healthy' : 'neutral',
    },
    {
      label: 'Open requests',
      value: formatCount(openRequests),
      hint: openRequests > 0 ? 'Needs triage' : 'Queue clear',
      health: openRequests > 0 ? 'attention' : 'healthy',
    },
    {
      label: 'Officers online',
      value: formatCount(officersOnline),
      hint: officersOnline > 0 ? 'On duty now' : 'No coverage',
      health: officersOnline > 0 ? 'healthy' : 'attention',
    },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Performance snapshot</Text>
      <View style={styles.primaryTray}>
        <PrimaryMrrCard mrr={mrr} revenueTrendPercent={revenueTrendPercent} />
      </View>
      <View style={styles.secondaryRow}>
        {secondaryKpis.map((kpi) => (
          <SecondaryKpiCard key={kpi.label} kpi={kpi} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.xxs,
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  primaryTray: {
    backgroundColor: adminColors.dashboard.primaryMetricTint,
    borderRadius: radius.sm,
    padding: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: adminColors.dashboard.ctaBorder,
  },
  primaryCard: {
    backgroundColor: adminColors.dashboard.metricBgPrimary,
    borderRadius: radius.sm - 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: adminColors.dashboard.panelBorder,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.xxs,
    shadowColor: adminColors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  primaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  primaryEyebrow: {
    fontSize: 8,
    fontWeight: '700',
    color: adminColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  primaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  hintPill: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  hintPillUp: {
    backgroundColor: adminColors.dashboard.kpiTrendUpBg,
    borderColor: adminColors.dashboard.kpiTrendUpBorder,
  },
  hintPillDown: {
    backgroundColor: adminColors.dashboard.kpiTrendDownBg,
    borderColor: adminColors.dashboard.kpiTrendDownBorder,
  },
  hintPillFlat: {
    backgroundColor: adminColors.dashboard.surfacePastel,
    borderColor: adminColors.dashboard.panelBorder,
  },
  hintPillText: {
    fontSize: 9,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
  hintTextUp: { color: adminColors.badgeActive },
  hintTextDown: { color: adminColors.badgeBlocked },
  hintTextFlat: { color: colors.textSecondary },
  primaryValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
    lineHeight: 36,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  secondaryCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: adminColors.dashboard.panelBorder,
    backgroundColor: adminColors.dashboard.metricBgSecondary,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxs + 2,
    gap: 1,
  },
  secondaryCardUrgent: {
    backgroundColor: adminColors.dashboard.kpiUrgentBg,
    borderColor: adminColors.dashboard.kpiUrgentBorder,
  },
  secondaryLabel: {
    fontSize: 7,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    opacity: 0.9,
  },
  secondaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
    lineHeight: 18,
  },
  secondaryValueUrgent: {
    fontSize: 17,
    color: adminColors.badgePending,
  },
  secondaryHint: {
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
