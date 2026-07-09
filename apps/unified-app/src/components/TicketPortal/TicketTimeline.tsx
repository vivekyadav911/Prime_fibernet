import { StyleSheet, Text, View } from 'react-native';
import { format } from 'date-fns';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { TicketActivityEvent } from '@/types/tickets';

type TicketTimelineProps = {
  events: TicketActivityEvent[];
};

function eventTimestampMs(value: TicketActivityEvent['timestamp'] | string | undefined): number {
  if (value == null) return 0;
  const ms = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isNaN(ms) ? 0 : ms;
}

function toEventDate(value: TicketActivityEvent['timestamp'] | string | undefined): Date {
  const ms = eventTimestampMs(value);
  return ms ? new Date(ms) : new Date(0);
}

function eventLabel(event: TicketActivityEvent): string {
  switch (event.type) {
    case 'created':
      return 'Ticket created';
    case 'status_changed':
      return event.metadata?.newStatus
        ? `Status updated to ${event.metadata.newStatus}`
        : 'Status updated';
    case 'priority_changed':
      return 'Priority changed';
    case 'officer_assigned':
      return 'Officer assigned';
    case 'officer_reassigned':
      return 'Officer reassigned';
    case 'note_added':
      return 'Note added';
    case 'linked_to_request':
      return 'Request linked';
    case 'resolved':
      return 'Resolved';
    case 'closed':
      return 'Closed';
    case 'reopened':
      return 'Reopened';
    case 'sla_breached':
      return 'SLA breached';
    default:
      return 'Activity';
  }
}

export function TicketTimeline({ events }: TicketTimelineProps) {
  const sorted = [...events].sort(
    (a, b) => eventTimestampMs(b.timestamp) - eventTimestampMs(a.timestamp),
  );

  return (
    <View style={styles.wrap}>
      {sorted.map((event, index) => (
        <View key={event.id} style={styles.row}>
          <View style={styles.lineCol}>
            <View style={[styles.dot, index === 0 ? styles.dotFilled : styles.dotOutline]} />
            {index < sorted.length - 1 ? <View style={styles.line} /> : null}
          </View>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.label}>{eventLabel(event)}</Text>
              <Text style={styles.time}>{format(toEventDate(event.timestamp), 'MMM dd, HH:mm')}</Text>
            </View>
            <Text style={styles.by}>by {event.performedBy}</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 56,
  },
  lineCol: {
    alignItems: 'center',
    width: 16,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  dotFilled: {
    backgroundColor: adminColors.primary,
  },
  dotOutline: {
    borderWidth: 2,
    borderColor: colors.borderDefault,
    backgroundColor: adminColors.cardBg,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.borderDefault,
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  time: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  by: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  description: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
