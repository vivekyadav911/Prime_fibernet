import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AdminEmptyState } from '@/components/admin';
import { FullScreenModalShell } from '@/components/common';
import { PortalTicketCard } from '@/components/TicketPortal/PortalTicketCard';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { PortalTicketItem } from '@/types/portalTicket';

type MobileAssignmentTab = 'unassigned' | 'assigned';

type TicketAssignmentBoardModalProps = {
  visible: boolean;
  onClose: () => void;
  unassignedItems: PortalTicketItem[];
  assignedItems: PortalTicketItem[];
  onPressItem: (item: PortalTicketItem) => void;
  onAssign: (item: PortalTicketItem) => void;
  refreshing: boolean;
  onRefresh: () => void;
};

export function TicketAssignmentBoardModal({
  visible,
  onClose,
  unassignedItems,
  assignedItems,
  onPressItem,
  onAssign,
  refreshing,
  onRefresh,
}: TicketAssignmentBoardModalProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 600;
  const [mobileTab, setMobileTab] = useState<MobileAssignmentTab>('unassigned');

  const renderItem = useCallback(
    ({ item }: { item: PortalTicketItem }) => (
      <PortalTicketCard
        item={item}
        variant={item.assignedOfficerId ? 'assigned' : 'unassigned'}
        density="compact"
        onPress={() => onPressItem(item)}
        onAssign={!item.assignedOfficerId ? () => onAssign(item) : undefined}
      />
    ),
    [onAssign, onPressItem],
  );

  const renderColumn = useCallback(
    (title: string, data: PortalTicketItem[], variant: 'unassigned' | 'assigned') => (
      <View style={isWide ? styles.column : styles.columnMobile}>
        <View style={styles.columnHeader}>
          <Text style={styles.columnTitle}>{title}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{data.length}</Text>
          </View>
        </View>
        {data.length === 0 ? (
          <AdminEmptyState
            title={variant === 'unassigned' ? 'No unassigned tickets' : 'No assigned tickets'}
            subtitle={
              variant === 'unassigned'
                ? 'Nice work — the queue is clear.'
                : 'Assign officers from the unassigned column.'
            }
            iconName="ticket-outline"
          />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            style={styles.list}
            refreshing={refreshing}
            onRefresh={onRefresh}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          />
        )}
      </View>
    ),
    [isWide, onRefresh, refreshing, renderItem],
  );

  return (
    <FullScreenModalShell
      visible={visible}
      onRequestClose={onClose}
      title="Assignment Board"
      onCancel={onClose}
      cancelLabel="Close"
    >
      <View style={styles.body}>
        {isWide ? (
          <View style={styles.columnsRow}>
            {renderColumn('Unassigned', unassignedItems, 'unassigned')}
            {renderColumn('Assigned to Officers', assignedItems, 'assigned')}
          </View>
        ) : (
          <>
            <View style={styles.tabRow}>
              <Pressable
                style={[styles.tab, mobileTab === 'unassigned' && styles.tabActive]}
                onPress={() => setMobileTab('unassigned')}
              >
                <Text style={[styles.tabText, mobileTab === 'unassigned' && styles.tabTextActive]}>
                  Unassigned ({unassignedItems.length})
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tab, mobileTab === 'assigned' && styles.tabActive]}
                onPress={() => setMobileTab('assigned')}
              >
                <Text style={[styles.tabText, mobileTab === 'assigned' && styles.tabTextActive]}>
                  Assigned ({assignedItems.length})
                </Text>
              </Pressable>
            </View>
            {mobileTab === 'unassigned'
              ? renderColumn('Unassigned', unassignedItems, 'unassigned')
              : renderColumn('Assigned to Officers', assignedItems, 'assigned')}
          </>
        )}
      </View>
    </FullScreenModalShell>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: adminColors.canvasBg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    minHeight: 0,
  },
  columnsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 0,
  },
  column: { flex: 1, minWidth: 0, minHeight: 0 },
  columnMobile: { flex: 1, minHeight: 0 },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  columnTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  countBadge: {
    backgroundColor: colors.borderDefault,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  countText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.xxl },
  tabRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceWhite,
    borderRadius: 8,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: 6 },
  tabActive: { backgroundColor: adminColors.primaryTint },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: adminColors.primary },
});
