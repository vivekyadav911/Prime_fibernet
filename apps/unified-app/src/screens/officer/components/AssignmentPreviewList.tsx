import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { TicketPriorityBadge, TicketStatusBadge } from '@/components/TicketPortal/TicketStatusBadge';
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
    navigation.dispatch(DrawerActions.jumpTo('RequestsStack'));
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
          <View key={`${item.kind}-${item.id}`} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.ticketNumber}>{item.displayNumber}</Text>
              {item.priority ? <TicketPriorityBadge priority={item.priority} /> : null}
            </View>
            <Text style={styles.category}>{item.categoryLabel}</Text>
            <Text style={styles.desc} numberOfLines={2}>
              {item.customerName} — {item.customerAddress}
            </Text>
            <TicketStatusBadge status={item.statusBucket} />
            <View style={styles.actions}>
              <OfficerPortalNavigateButton item={item} />
              <Pressable style={styles.openBtn} onPress={() => openDetail(item.id, item.kind)}>
                <Text style={styles.openText}>Open</Text>
              </Pressable>
            </View>
          </View>
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
    marginBottom: spacing.sm,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.primaryNavy },
  viewAll: { minHeight: 48, justifyContent: 'center' },
  viewAllText: { color: colors.accentTeal, fontWeight: '600', fontSize: 14 },
  emptyCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xxs,
    ...shadow.card,
  },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  ticketNumber: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.primaryNavy },
  category: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  desc: { fontSize: 13, color: colors.textSecondary },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  openBtn: {
    minHeight: 48,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentTeal,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
  },
  openText: { color: colors.white, fontWeight: '700' },
});
