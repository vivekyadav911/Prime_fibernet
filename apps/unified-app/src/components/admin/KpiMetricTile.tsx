import { StyleSheet, Text, View } from 'react-native';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export type KpiSurfaceKey = keyof typeof adminColors.kpiSurfaces;
export type KpiStatus = 'neutral' | 'healthy' | 'attention';
export type KpiTileVariant = 'default' | 'control';
export type KpiTileEmphasis = 'primary' | 'secondary';

type KpiMetricTileProps = {
  label: string;
  value: string | number;
  icon?: string;
  surface?: KpiSurfaceKey;
  status?: KpiStatus;
  trend?: number;
  variant?: KpiTileVariant;
  emphasis?: KpiTileEmphasis;
};

const STATUS_DOT: Record<KpiStatus, string> = {
  neutral: adminColors.kpiSurfaces.neutral.accent,
  healthy: adminColors.badgeActive,
  attention: adminColors.badgePending,
};

function ControlKpiTile({
  label,
  value,
  surface = 'neutral',
  status = 'neutral',
  trend,
  emphasis = 'secondary',
}: KpiMetricTileProps) {
  const palette = adminColors.kpiSurfaces[surface];
  const isPrimary = emphasis === 'primary';

  return (
    <View
      style={[
        styles.controlTile,
        isPrimary ? styles.controlPrimary : styles.controlSecondary,
        { borderLeftColor: palette.accent },
      ]}
    >
      <View style={styles.controlTop}>
        <Text style={[styles.controlLabel, isPrimary && styles.controlLabelPrimary]} numberOfLines={1}>
          {label}
        </Text>
        {!isPrimary && status !== 'neutral' ? (
          <View style={[styles.statusMark, { backgroundColor: STATUS_DOT[status] }]} />
        ) : null}
      </View>
      <View style={styles.controlValueRow}>
        <Text style={[styles.controlValue, isPrimary && styles.controlValuePrimary]}>{value}</Text>
        {trend != null ? (
          <Text style={[styles.controlTrend, trend >= 0 ? styles.trendUp : styles.trendDown]}>
            {trend >= 0 ? '+' : ''}
            {trend}% MoM
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function KpiMetricTile({
  label,
  value,
  icon,
  surface = 'neutral',
  status = 'neutral',
  trend,
  variant = 'default',
  emphasis = 'secondary',
}: KpiMetricTileProps) {
  if (variant === 'control') {
    return (
      <ControlKpiTile
        label={label}
        value={value}
        surface={surface}
        status={status}
        trend={trend}
        emphasis={emphasis}
      />
    );
  }

  const palette = adminColors.kpiSurfaces[surface];

  return (
    <View style={[styles.tile, { backgroundColor: palette.bg }]}>
      <View style={styles.topRow}>
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: palette.icon }]}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
        ) : (
          <View style={styles.iconSpacer} />
        )}
        <View style={[styles.statusDot, { backgroundColor: STATUS_DOT[status] }]} />
      </View>

      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[styles.value, { color: palette.accent }]}>{value}</Text>

      {trend != null ? (
        <Text style={[styles.trend, trend >= 0 ? styles.trendUp : styles.trendDown]}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </Text>
      ) : (
        <View style={[styles.accentLine, { backgroundColor: palette.accent }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 128,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs + 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderDefault,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSpacer: {
    width: 28,
    height: 28,
  },
  icon: {
    fontSize: 14,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    lineHeight: 13,
    marginBottom: spacing.xxs,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
    lineHeight: 24,
  },
  accentLine: {
    height: 2,
    borderRadius: radius.full,
    marginTop: spacing.xs,
    opacity: 0.45,
    alignSelf: 'stretch',
  },
  trend: {
    fontSize: 10,
    marginTop: spacing.xxs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  trendUp: { color: adminColors.badgeActive },
  trendDown: { color: adminColors.badgeBlocked },
  controlTile: {
    borderLeftWidth: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: adminColors.dashboard.panelBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  controlPrimary: {
    backgroundColor: adminColors.dashboard.metricBgPrimary,
    paddingVertical: spacing.sm,
  },
  controlSecondary: {
    backgroundColor: adminColors.dashboard.metricBg,
    flex: 1,
    minWidth: 0,
  },
  controlTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  controlLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1,
  },
  controlLabelPrimary: {
    fontSize: 10,
    letterSpacing: 0.9,
  },
  statusMark: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginLeft: spacing.xxs,
  },
  controlValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  controlValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  controlValuePrimary: {
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.6,
  },
  controlTrend: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
