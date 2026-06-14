import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

import { AvatarIcon } from '@/components/admin';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { Ticket } from '@/types/tickets';
import { truncateTicketNumber } from '@/utils/ticketViewMappers';

import { PoolBadge, TicketPriorityBadge, TicketStatusBadge } from './TicketStatusBadge';
import { SLAIndicator } from './SLAIndicator';

const COMPLAINT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Technical Issue': 'build-outline',
  'Billing Dispute': 'card-outline',
  'Speed Issue': 'speedometer-outline',
  'No Internet': 'wifi-outline',
  'Hardware Fault': 'hardware-chip-outline',
  Relocation: 'location-outline',
  'New Connection': 'add-circle-outline',
  Other: 'help-circle-outline',
};

type TicketCardProps = {
  ticket: Ticket;
  onPress: (ticket: Ticket) => void;
};

export function TicketCard({ ticket, onPress }: TicketCardProps) {
  const iconName = COMPLAINT_ICONS[ticket.complaintType] ?? 'help-circle-outline';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Ionicons name={iconName} size={20} color={adminColors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.ticketNumber}>{truncateTicketNumber(ticket.ticketNumber)}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {ticket.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {ticket.contactName}
            {ticket.city ? ` · ${ticket.city}` : ''}
          </Text>
          <Text style={styles.time}>
            {formatDistanceToNow(ticket.createdAt, { addSuffix: true })}
          </Text>
        </View>
        <View style={styles.badges}>
          <TicketPriorityBadge priority={ticket.priority} compact />
          {ticket.assignedOfficerId ? (
            <TicketStatusBadge status={ticket.status} compact />
          ) : (
            <PoolBadge />
          )}
          <SLAIndicator ticket={ticket} mode="compact" />
        </View>
      </View>

      <View style={styles.footer}>
        {ticket.assignedOfficerId ? (
          <View style={styles.officerRow}>
            <AvatarIcon name={ticket.assignedOfficerName ?? 'Officer'} size={28} />
            <Text style={styles.officerName}>{ticket.assignedOfficerName}</Text>
          </View>
        ) : (
          <Text style={styles.unassigned}>Unassigned</Text>
        )}
        <Text style={styles.viewLink} onPress={() => onPress(ticket)}>
          View
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: `${adminColors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  ticketNumber: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: adminColors.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  time: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badges: {
    alignItems: 'flex-end',
    gap: spacing.xxs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
  },
  officerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  officerName: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  unassigned: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  viewLink: {
    fontSize: 13,
    fontWeight: '600',
    color: adminColors.primary,
  },
});
