import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { Ticket } from '@/types/tickets';
import {
  DEFAULT_SLA_POLICIES,
  formatSLARemaining,
  getSLAColor,
} from '@/utils/slaUtils';

type SLAIndicatorProps = {
  ticket: Ticket;
  mode?: 'compact' | 'full';
};

function BarRow({
  label,
  deadline,
  remainingMs,
  totalMs,
  animatedWidth,
}: {
  label: string;
  deadline: Date;
  remainingMs: number;
  totalMs: number;
  animatedWidth: Animated.Value;
}) {
  const color = getSLAColor(remainingMs, totalMs);

  return (
    <View style={styles.barSection}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={[styles.barRemaining, { color }]}>{formatSLARemaining(remainingMs)}</Text>
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
      <Text style={styles.deadline}>Deadline: {format(deadline, 'MMM d, yyyy HH:mm')}</Text>
    </View>
  );
}

export function SLAIndicator({ ticket, mode = 'compact' }: SLAIndicatorProps) {
  const policy = DEFAULT_SLA_POLICIES[ticket.priority];
  const responseTotalMs = policy.responseTimeHours * 60 * 60 * 1000;
  const resolutionTotalMs = policy.resolutionTimeHours * 60 * 60 * 1000;
  const responsePct = Math.max(
    0,
    Math.min(1, ticket.slaStatus.responseRemainingMs / responseTotalMs),
  );
  const resolutionPct = Math.max(
    0,
    Math.min(1, ticket.slaStatus.resolutionRemainingMs / resolutionTotalMs),
  );

  const responseAnim = useRef(new Animated.Value(0)).current;
  const resolutionAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(responseAnim, {
      toValue: responsePct,
      duration: 600,
      useNativeDriver: false,
    }).start();
    Animated.timing(resolutionAnim, {
      toValue: resolutionPct,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [responseAnim, resolutionAnim, responsePct, resolutionPct]);

  if (mode === 'compact') {
    const remaining = Math.min(
      ticket.slaStatus.responseRemainingMs,
      ticket.slaStatus.resolutionRemainingMs,
    );
    const total = Math.min(responseTotalMs, resolutionTotalMs);
    const color = getSLAColor(remaining, total);
    return (
      <View style={styles.compact}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.compactText, { color }]}>{formatSLARemaining(remaining)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.full}>
      <BarRow
        label="Response SLA"
        deadline={ticket.slaStatus.responseDeadline}
        remainingMs={ticket.slaStatus.responseRemainingMs}
        totalMs={responseTotalMs}
        animatedWidth={responseAnim}
      />
      <BarRow
        label="Resolution SLA"
        deadline={ticket.slaStatus.resolutionDeadline}
        remainingMs={ticket.slaStatus.resolutionRemainingMs}
        totalMs={resolutionTotalMs}
        animatedWidth={resolutionAnim}
      />
    </View>
  );
}

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
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  barRemaining: {
    fontSize: 11,
    fontWeight: '700',
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
  deadline: {
    fontSize: 10,
    color: colors.textSecondary,
  },
});
