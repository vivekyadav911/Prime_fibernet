import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { Ticket } from '@/types/tickets';
import {
  formatSlaProgressLabel,
  getEffectiveResolutionSlaStatus,
  getEffectiveResponseSlaStatus,
  getSLAPolicy,
  getSlaProgressState,
} from '@/utils/slaUtils';

type SLAProgressBarProps = {
  ticket: Ticket;
  mode?: 'compact' | 'full';
};

const STATE_COLORS = {
  on_track: adminColors.primary,
  at_risk: adminColors.badgePending,
  breached: adminColors.badgeBlocked,
  met: adminColors.badgeActive,
} as const;

function SlaBar({
  label,
  deadline,
  windowStart,
  windowMs,
  status,
  eventAt,
  animatedWidth,
}: {
  label: string;
  deadline: Date;
  windowStart: Date;
  windowMs: number;
  status: ReturnType<typeof getEffectiveResponseSlaStatus>;
  eventAt: Date | null;
  animatedWidth: Animated.Value;
}) {
  const now = Date.now();
  const elapsedMs = Math.min(
    windowMs,
    Math.max(0, (eventAt?.getTime() ?? now) - windowStart.getTime()),
  );
  const progressState = getSlaProgressState(status, elapsedMs, windowMs);
  const color = STATE_COLORS[progressState];
  const fillRatio =
    status === 'met' || status === 'breached'
      ? 1
      : Math.max(0, Math.min(1, elapsedMs / windowMs));

  const statusLabel = formatSlaProgressLabel(
    label.toLowerCase().includes('response') ? 'response' : 'resolution',
    status,
    deadline,
    eventAt,
  );

  return (
    <View style={styles.barSection}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={[styles.barRemaining, { color }]}>{statusLabel}</Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              width: animatedWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.deadline}>Deadline: {format(deadline, 'MMM d, yyyy HH:mm')}</Text>
        {eventAt ? (
          <Text style={styles.eventAt}>
            {label.includes('Response') ? 'Responded' : 'Resolved'}:{' '}
            {format(eventAt, 'MMM d, yyyy HH:mm')}
          </Text>
        ) : null}
      </View>
      {progressState === 'at_risk' ? (
        <Text style={[styles.riskHint, { color }]}>At risk — over 75% of SLA window elapsed</Text>
      ) : null}
      {/* drive animation from computed ratio */}
      <AnimatedFillDriver animatedWidth={animatedWidth} ratio={fillRatio} />
    </View>
  );
}

function AnimatedFillDriver({
  animatedWidth,
  ratio,
}: {
  animatedWidth: Animated.Value;
  ratio: number;
}) {
  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: ratio,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [animatedWidth, ratio]);
  return null;
}

export function SLAProgressBar({ ticket, mode = 'compact' }: SLAProgressBarProps) {
  const policy = getSLAPolicy(ticket.priority);
  const responseTotalMs = policy.responseTimeHours * 60 * 60 * 1000;
  const resolutionTotalMs = policy.resolutionTimeHours * 60 * 60 * 1000;

  const responseStatus = getEffectiveResponseSlaStatus(ticket);
  const resolutionStatus = getEffectiveResolutionSlaStatus(ticket);

  const responseAnim = useRef(new Animated.Value(0)).current;
  const resolutionAnim = useRef(new Animated.Value(0)).current;

  const compactRemaining = useMemo(() => {
    const remaining = Math.min(
      ticket.slaStatus.responseRemainingMs,
      ticket.slaStatus.resolutionRemainingMs,
    );
    const worstStatus =
      responseStatus === 'breached' || resolutionStatus === 'breached'
        ? 'breached'
        : responseStatus === 'met' && resolutionStatus === 'met'
          ? 'met'
          : 'pending';
    const color =
      worstStatus === 'breached'
        ? STATE_COLORS.breached
        : worstStatus === 'met'
          ? STATE_COLORS.met
          : remaining < responseTotalMs * 0.25
            ? STATE_COLORS.at_risk
            : STATE_COLORS.on_track;
    return { remaining, color, worstStatus };
  }, [
    ticket.slaStatus.responseRemainingMs,
    ticket.slaStatus.resolutionRemainingMs,
    responseStatus,
    resolutionStatus,
    responseTotalMs,
  ]);

  if (mode === 'compact') {
    return (
      <View style={styles.compact}>
        <View style={[styles.dot, { backgroundColor: compactRemaining.color }]} />
        <Text style={[styles.compactText, { color: compactRemaining.color }]}>
          {compactRemaining.worstStatus === 'met'
            ? 'SLA met'
            : compactRemaining.worstStatus === 'breached'
              ? 'SLA breached'
              : `${Math.max(0, Math.floor(compactRemaining.remaining / 60000))}m left`}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.full}>
      <SlaBar
        label="Response SLA"
        deadline={ticket.slaStatus.responseDeadline}
        windowStart={ticket.createdAt}
        windowMs={responseTotalMs}
        status={responseStatus}
        eventAt={ticket.respondedAt}
        animatedWidth={responseAnim}
      />
      <SlaBar
        label="Resolution SLA"
        deadline={ticket.slaStatus.resolutionDeadline}
        windowStart={ticket.createdAt}
        windowMs={resolutionTotalMs}
        status={resolutionStatus}
        eventAt={ticket.resolvedAt}
        animatedWidth={resolutionAnim}
      />
    </View>
  );
}

/** @deprecated Use SLAProgressBar */
export const SLAIndicator = SLAProgressBar;

const styles = StyleSheet.create({
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactText: {
    fontSize: 10,
    fontWeight: '600',
  },
  full: {
    gap: spacing.md,
  },
  barSection: {
    gap: spacing.xxs,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  barRemaining: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  track: {
    height: 8,
    backgroundColor: colors.borderDefault,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  metaRow: {
    gap: 2,
  },
  deadline: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  eventAt: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  riskHint: {
    fontSize: 10,
    fontWeight: '600',
  },
});
