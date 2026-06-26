import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { TicketPriority, TicketStatus } from '@/types/tickets';

const STATUS_COLORS: Record<TicketStatus, { bg: string; text: string }> = {
  Open: { bg: '#FEF3C7', text: '#92400E' },
  'In Progress': { bg: '#DBEAFE', text: '#1D4ED8' },
  'Awaiting Customer': { bg: '#EDE9FE', text: '#5B21B6' },
  'Awaiting Parts': { bg: '#FFEDD5', text: '#C2410C' },
  Resolved: { bg: '#D1FAE5', text: '#065F46' },
  Closed: { bg: '#F3F4F6', text: '#374151' },
  Reopened: { bg: '#FEE2E2', text: '#B91C1C' },
};

const PRIORITY_COLORS: Record<TicketPriority, { bg: string; text: string }> = {
  Critical: { bg: '#EF4444', text: '#FFFFFF' },
  High: { bg: '#F97316', text: '#FFFFFF' },
  Medium: { bg: '#F59E0B', text: '#FFFFFF' },
  Low: { bg: '#9CA3AF', text: '#FFFFFF' },
};

type TicketStatusBadgeProps = { status: TicketStatus; compact?: boolean };
type TicketPriorityBadgeProps = { priority: TicketPriority; compact?: boolean };

export function TicketStatusBadge({ status, compact }: TicketStatusBadgeProps) {
  const colors = STATUS_COLORS[status];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, compact ? styles.compact : null]}>
      <Text style={[styles.text, { color: colors.text }, compact ? styles.compactText : null]}>
        {status}
      </Text>
    </View>
  );
}

export function TicketPriorityBadge({ priority, compact }: TicketPriorityBadgeProps) {
  const colors = PRIORITY_COLORS[priority];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, compact ? styles.compact : null]}>
      <Text style={[styles.text, { color: colors.text }, compact ? styles.compactText : null]}>
        {priority}
      </Text>
    </View>
  );
}

export function PoolBadge() {
  return (
    <View style={[styles.badge, styles.pool]}>
      <Text style={[styles.text, styles.poolText]}>Pool</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
  },
  compact: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
  compactText: {
    fontSize: 10,
  },
  pool: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  poolText: {
    color: colors.textSecondary,
  },
});
