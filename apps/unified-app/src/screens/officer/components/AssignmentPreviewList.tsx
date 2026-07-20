import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TicketPriorityBadge, TicketStatusBadge } from '@/components/TicketPortal/TicketStatusBadge';
import { navigateToOfficerTickets } from '@/navigation/officerShellNavigation';
import type { PortalTicketItem } from '@/types/portalTicket';
import { colors } from '@/theme/colors';
import { radius, shadow, spacing } from '@/theme/spacing';
import type { OfficerStackParamList } from '@/types/navigation';
import { selectTodayAssignmentPreview } from '@/utils/officerTicketFilters';

import { OfficerPortalNavigateButton } from './OfficerPortalNavigateButton';

type AssignmentPreviewListProps = {
  items: PortalTicketItem[] | undefined;
  limit?: number;
};

function complaintPreview(item: PortalTicketItem): string {
  const ticketDesc = item.ticket?.description?.trim();
  if (ticketDesc) return ticketDesc;
  const requestDesc = item.request?.description?.trim();
  if (requestDesc) return requestDesc;
  return item.categoryLabel;
}

export function AssignmentPreviewList({ items, limit = 3 }: AssignmentPreviewListProps) {
  const navigation = useNavigation<NativeStackNavigationProp<OfficerStackParamList>>();

  const preview = useMemo(
    () => selectTodayAssignmentPreview(items ?? [], limit),
    [items, limit],
  );

  const openDetail = useCallback(
    (itemId: string, kind: PortalTicketItem['kind']) => {
      navigation.navigate('RequestDetail', { requestId: itemId, kind });
    },
    [navigation],
  );

  const openAllTickets = useCallback(() => {
    navigateToOfficerTickets(navigation);
  }, [navigation]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Today&apos;s Assignments</Text>
        <Pressable onPress={openAllTickets} style={styles.viewAll}>
          <Text style={styles.viewAllText}>View All →</Text>
        </Pressable>
      </View>
      {preview.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No tickets assigned today</Text>
          <Text style={styles.emptySubtitle}>New assignments for today will appear here</Text>
        </View>
      ) : (
        preview.map((item) => (
          <Pressable
            key={`${item.kind}-${item.id}`}
            style={styles.card}
            onPress={() => openDetail(item.id, item.kind)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.ticketNumber} numberOfLines={1}>
                {item.displayNumber}
              </Text>
              {item.priority ? <TicketPriorityBadge priority={item.priority} compact /> : null}
              <TicketStatusBadge status={item.statusBucket} compact />
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {item.customerName}
              {item.categoryLabel ? ` · ${item.categoryLabel}` : ''}
            </Text>
            <Text style={styles.desc} numberOfLines={1}>
              {complaintPreview(item)}
            </Text>
            <View style={styles.actions}>
              <OfficerPortalNavigateButton item={item} />
              <Pressable
                style={styles.openBtn}
                onPress={() => openDetail(item.id, item.kind)}
                hitSlop={8}
              >
                <Text style={styles.openText}>Open</Text>
              </Pressable>
            </View>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.primaryNavy },
  viewAll: { minHeight: 40, justifyContent: 'center' },
  viewAllText: { color: colors.accentTeal, fontWeight: '600', fontSize: 13 },
  emptyCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.xxs,
    ...shadow.card,
  },
  emptyTitle: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  emptySubtitle: { fontSize: 12, color: colors.textSecondary },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
    gap: 2,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  ticketNumber: { flexShrink: 1, fontSize: 12, fontWeight: '700', color: colors.primaryNavy },
  meta: { fontSize: 11, color: colors.textSecondary },
  desc: { fontSize: 12, color: colors.textPrimary, lineHeight: 16 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  openBtn: {
    minHeight: 32,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentTeal,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  openText: { color: colors.white, fontWeight: '700', fontSize: 12 },
});
