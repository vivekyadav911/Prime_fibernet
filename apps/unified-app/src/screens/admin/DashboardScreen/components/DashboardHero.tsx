import { StyleSheet, Text, View } from 'react-native';

import { useAppSelector } from '@/store/hooks';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import { DashboardHealthStatus, type NetworkHealth } from './DashboardHealthStatus';
import { DashboardNextAction, type NextAction } from './DashboardNextAction';
import { DashboardPulseMetrics } from './DashboardPulseMetrics';
import { DashboardStatusHighlights, type StatusHighlight } from './DashboardStatusHighlights';

type DashboardHeroProps = {
  networkHealth: NetworkHealth;
  attentionCount: number;
  nextAction: NextAction;
  statusHighlights: StatusHighlight[];
  mrr: number;
  activeSubscribers: number;
  revenueTrendPercent?: number;
};

function formatToday(): string {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function DashboardHero({
  networkHealth,
  attentionCount,
  nextAction,
  statusHighlights,
  mrr,
  activeSubscribers,
  revenueTrendPercent,
}: DashboardHeroProps) {
  const userName = useAppSelector((s) => s.auth.user?.name);
  const firstName = userName?.split(' ')[0] ?? 'Admin';
  const activeHighlights = statusHighlights.filter((h) => h.count > 0);

  return (
    <View style={styles.root}>
      <View style={styles.panel}>
        <View style={styles.topRow}>
          <DashboardHealthStatus health={networkHealth} attentionCount={attentionCount} />
          <View style={styles.metaCol}>
            <Text style={styles.date}>{formatToday()}</Text>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>
        </View>

        <DashboardNextAction action={nextAction} />

        {activeHighlights.length > 0 ? (
          <View style={styles.actionBlock}>
            <Text style={styles.actionLabel}>Attention now</Text>
            <DashboardStatusHighlights highlights={activeHighlights} />
          </View>
        ) : null}

        <DashboardPulseMetrics
          mrr={mrr}
          activeSubscribers={activeSubscribers}
          revenueTrendPercent={revenueTrendPercent}
        />

        <Text style={styles.greeting} numberOfLines={1}>
          {firstName} · ISP admin
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginBottom: adminColors.dashboard.sectionGap,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  panel: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: adminColors.dashboard.panelBorder,
    padding: spacing.sm,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.xs,
  },
  metaCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.xxs,
  },
  date: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: adminColors.dashboard.panelBorder,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: adminColors.dashboard.surfacePastel,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: adminColors.badgeActive,
  },
  liveText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  actionBlock: {
    gap: spacing.xxs,
  },
  actionLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  greeting: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'right',
  },
});
