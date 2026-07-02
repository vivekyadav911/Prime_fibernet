import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

import { AvatarIcon } from '@/components/admin';
import { PoolBadge, TicketPriorityBadge, TicketStatusBadge } from '@/components/TicketPortal/TicketStatusBadge';
import { SLAProgressBar } from '@/components/TicketPortal/SLAProgressBar';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { PortalTicketItem } from '@/types/portalTicket';
import { truncateRequestId } from '@/utils/requestViewMappers';
import { truncateTicketNumber } from '@/utils/ticketViewMappers';

type PortalTicketCardProps = {
  item: PortalTicketItem;
  variant?: 'unassigned' | 'assigned' | 'list';
  onPress: () => void;
  onAssign?: () => void;
};

const SOURCE_LABELS: Record<PortalTicketItem['source'], string> = {
  customer: 'Customer',
  officer: 'Officer',
  admin: 'Admin',
};

function displayNumber(item: PortalTicketItem): string {
  if (item.kind === 'ticket') return truncateTicketNumber(item.displayNumber);
  return truncateRequestId(item.requestId ?? item.id, item.displayNumber);
}

export function PortalTicketCard({ item, variant = 'list', onPress, onAssign }: PortalTicketCardProps) {
  const relativeTime =
    variant === 'assigned' && item.assignedAt
      ? `Assigned ${formatDistanceToNow(item.assignedAt, { addSuffix: true })}`
      : `Created ${formatDistanceToNow(item.createdAt, { addSuffix: true })}`;

  const statusForBadge = item.ticket?.status ?? item.statusBucket;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.headerRow}>
        {item.ticket ? (
          <TicketStatusBadge status={statusForBadge as import('@/types/tickets').TicketStatus} compact />
        ) : (
          <View style={styles.requestStatusBadge}>
            <Text style={styles.requestStatusText}>{item.statusBucket}</Text>
          </View>
        )}
        <View style={styles.sourceBadge}>
          <Text style={styles.sourceText}>{SOURCE_LABELS[item.source]}</Text>
        </View>
      </View>

      <Text style={styles.number}>{displayNumber(item)}</Text>
      <Text style={styles.category}>{item.categoryLabel}</Text>
      <Text style={styles.relativeTime}>{relativeTime}</Text>

      <View style={styles.infoBlock}>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.infoText} numberOfLines={1}>
            {item.customerName}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="wifi-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.infoText, item.planName === 'Unknown Plan' && styles.mutedText]} numberOfLines={1}>
            {item.planName}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.infoText} numberOfLines={2}>
            {item.customerAddress || 'No address'}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        {item.assignedOfficerId ? (
          <View style={styles.officerRow}>
            <AvatarIcon name={item.assignedOfficerName ?? 'Officer'} size={28} />
            <View style={styles.officerText}>
              <Text style={styles.officerName}>{item.assignedOfficerName}</Text>
              {item.assignedOfficerRole ? (
                <Text style={styles.officerRole}>{item.assignedOfficerRole}</Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.unassignedRow}>
            <PoolBadge />
            {onAssign ? (
              <Pressable style={styles.assignBtn} onPress={onAssign}>
                <Text style={styles.assignBtnText}>Assign</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        <View style={styles.metaCol}>
          {item.priority ? <TicketPriorityBadge priority={item.priority} compact /> : null}
          {item.ticket ? <SLAProgressBar ticket={item.ticket} mode="compact" /> : null}
          <Text style={styles.viewLink}>View Details</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  requestStatusBadge: {
    backgroundColor: adminColors.primaryTint,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  requestStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: adminColors.primary,
  },
  sourceBadge: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  number: {
    fontSize: 13,
    fontWeight: '700',
    color: adminColors.primary,
  },
  category: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  relativeTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  infoBlock: { gap: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  infoText: { flex: 1, fontSize: 13, color: colors.textPrimary },
  mutedText: { color: colors.textSecondary },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  officerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  officerText: { flex: 1, minWidth: 0 },
  officerName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  officerRole: { fontSize: 11, color: colors.textSecondary },
  unassignedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  assignBtn: {
    backgroundColor: adminColors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 32,
    justifyContent: 'center',
  },
  assignBtnText: { color: colors.surfaceWhite, fontSize: 12, fontWeight: '700' },
  metaCol: { alignItems: 'flex-end', gap: 4 },
  viewLink: { fontSize: 13, fontWeight: '700', color: adminColors.primary },
});
