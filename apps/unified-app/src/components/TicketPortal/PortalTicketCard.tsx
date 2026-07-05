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
  density?: 'default' | 'compact';
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

export function PortalTicketCard({
  item,
  variant = 'list',
  density = 'default',
  onPress,
  onAssign,
}: PortalTicketCardProps) {
  const isCompact = density === 'compact';
  const relativeTime =
    variant === 'assigned' && item.assignedAt
      ? `Assigned ${formatDistanceToNow(item.assignedAt, { addSuffix: true })}`
      : `Created ${formatDistanceToNow(item.createdAt, { addSuffix: true })}`;

  const statusForBadge = item.ticket?.status ?? item.statusBucket;
  const iconSize = isCompact ? 12 : 14;
  const avatarSize = isCompact ? 22 : 28;

  return (
    <Pressable style={[styles.card, isCompact && styles.cardCompact]} onPress={onPress}>
      <View style={[styles.headerRow, isCompact && styles.headerRowCompact]}>
        {item.ticket ? (
          <TicketStatusBadge status={statusForBadge as import('@/types/tickets').TicketStatus} compact />
        ) : (
          <View style={[styles.requestStatusBadge, isCompact && styles.requestStatusBadgeCompact]}>
            <Text style={styles.requestStatusText}>{item.statusBucket}</Text>
          </View>
        )}
        <View style={[styles.sourceBadge, isCompact && styles.sourceBadgeCompact]}>
          <Text style={styles.sourceText}>{SOURCE_LABELS[item.source]}</Text>
        </View>
      </View>

      {isCompact ? (
        <View style={styles.titleRowCompact}>
          <Text style={styles.numberCompact}>{displayNumber(item)}</Text>
          <Text style={styles.categoryCompact} numberOfLines={1}>
            {item.categoryLabel}
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.number}>{displayNumber(item)}</Text>
          <Text style={styles.category}>{item.categoryLabel}</Text>
        </>
      )}
      <Text style={[styles.relativeTime, isCompact && styles.relativeTimeCompact]}>{relativeTime}</Text>

      <View style={[styles.infoBlock, isCompact && styles.infoBlockCompact]}>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={iconSize} color={colors.textSecondary} />
          <Text style={[styles.infoText, isCompact && styles.infoTextCompact]} numberOfLines={1}>
            {item.customerName}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="wifi-outline" size={iconSize} color={colors.textSecondary} />
          <Text
            style={[
              styles.infoText,
              isCompact && styles.infoTextCompact,
              item.planName === 'Unknown Plan' && styles.mutedText,
            ]}
            numberOfLines={1}
          >
            {item.planName}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={iconSize} color={colors.textSecondary} />
          <Text
            style={[styles.infoText, isCompact && styles.infoTextCompact]}
            numberOfLines={isCompact ? 1 : 2}
          >
            {item.customerAddress || 'No address'}
          </Text>
        </View>
      </View>

      <View style={[styles.footer, isCompact && styles.footerCompact]}>
        {item.assignedOfficerId ? (
          <View style={styles.officerRow}>
            <AvatarIcon name={item.assignedOfficerName ?? 'Officer'} size={avatarSize} />
            <View style={styles.officerText}>
              <Text style={[styles.officerName, isCompact && styles.officerNameCompact]}>
                {item.assignedOfficerName}
              </Text>
              {item.assignedOfficerRole ? (
                <Text style={styles.officerRole}>{item.assignedOfficerRole}</Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.unassignedRow}>
            <PoolBadge />
            {onAssign ? (
              <Pressable style={[styles.assignBtn, isCompact && styles.assignBtnCompact]} onPress={onAssign}>
                <Text style={styles.assignBtnText}>Assign</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        <View style={styles.metaCol}>
          {item.priority ? <TicketPriorityBadge priority={item.priority} compact /> : null}
          {item.ticket ? <SLAProgressBar ticket={item.ticket} mode="compact" /> : null}
          <Text style={[styles.viewLink, isCompact && styles.viewLinkCompact]}>View Details</Text>
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
  cardCompact: {
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  headerRowCompact: {
    marginBottom: spacing.xxs,
  },
  requestStatusBadge: {
    backgroundColor: adminColors.primaryTint,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  requestStatusBadgeCompact: {
    paddingHorizontal: spacing.xs,
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
  sourceBadgeCompact: {
    paddingHorizontal: spacing.xs,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  titleRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  number: {
    fontSize: 13,
    fontWeight: '700',
    color: adminColors.primary,
  },
  numberCompact: {
    fontSize: 12,
    fontWeight: '700',
    color: adminColors.primary,
  },
  category: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  categoryCompact: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    minWidth: 0,
  },
  relativeTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  relativeTimeCompact: {
    fontSize: 11,
    marginTop: 0,
    marginBottom: spacing.xs,
  },
  infoBlock: { gap: 4 },
  infoBlockCompact: { gap: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  infoText: { flex: 1, fontSize: 13, color: colors.textPrimary },
  infoTextCompact: { fontSize: 12 },
  mutedText: { color: colors.textSecondary },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  footerCompact: {
    marginTop: spacing.xs,
  },
  officerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  officerText: { flex: 1, minWidth: 0 },
  officerName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  officerNameCompact: { fontSize: 12 },
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
  assignBtnCompact: {
    minHeight: 28,
    paddingVertical: spacing.xxs,
  },
  assignBtnText: { color: colors.surfaceWhite, fontSize: 12, fontWeight: '700' },
  metaCol: { alignItems: 'flex-end', gap: 4 },
  viewLink: { fontSize: 13, fontWeight: '700', color: adminColors.primary },
  viewLinkCompact: { fontSize: 12 },
});
