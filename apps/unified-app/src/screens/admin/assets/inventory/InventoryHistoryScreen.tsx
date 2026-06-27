import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { HistoryCard, HistoryListRow } from '@/components/Inventory';
import { AdminButton, AdminScreenLayout, AdminEmptyState, AdminStateShell, RoleGuard } from '@/components/admin';
import { DateRangePicker } from '@/components/common/pickers';
import { SkeletonLoader } from '@/components/common';
import { useInventoryHistory } from '@/hooks/useInventoryHistory';
import { fetchInventoryItems } from '@/services/inventoryService';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminInventoryStackParamList } from '@/types/navigation';
import type { ActionType, InventoryHistoryEntry, InventoryItem } from '@/types/inventory';
import { DEFAULT_HISTORY_FILTERS } from '@/types/inventory';
import {
  countActiveHistoryFilters,
  formatShortDateRange,
  getActionIcon,
  getActionIconColor,
  getActionLabel,
} from '@/utils/inventoryUtils';

type Props = NativeStackScreenProps<AdminInventoryStackParamList, 'InventoryHistory'>;

const ACTION_TYPES: (ActionType | 'all')[] = [
  'all', 'add_stock', 'sold', 'damaged', 'returned', 'assigned', 'edit',
];

type HistorySection = {
  title: string;
  data: InventoryHistoryEntry[];
};

type HistoryViewMode = 'list' | 'cards';

export function InventoryHistoryScreen({ navigation }: Props) {
  const {
    history,
    groupedHistory,
    filters,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    setFilters,
    loadMore,
    refresh,
  } = useInventoryHistory();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filterModal, setFilterModal] = useState<'item' | 'type' | 'date' | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewMode, setViewMode] = useState<HistoryViewMode>('list');

  useEffect(() => {
    void fetchInventoryItems().then(setItems);
  }, []);

  const sections: HistorySection[] = useMemo(
    () => groupedHistory.map((g) => ({ title: g.date, data: g.entries })),
    [groupedHistory],
  );

  const activeFilterCount = useMemo(() => countActiveHistoryFilters(filters), [filters]);

  const selectedItemName = filters.itemId
    ? items.find((i) => i.id === filters.itemId)?.name ?? 'Item'
    : 'All';

  const dateFilterLabel = formatShortDateRange(filters.dateFrom, filters.dateTo);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_HISTORY_FILTERS);
    setDateFrom('');
    setDateTo('');
  }, [setFilters]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={refresh} hitSlop={8} style={styles.headerRefreshBtn}>
          <Ionicons name="refresh-outline" size={22} color={colors.white} />
        </Pressable>
      ),
    });
  }, [navigation, refresh]);

  const renderFilterChip = (
    label: string,
    active: boolean,
    onPress: () => void,
    icon?: keyof typeof Ionicons.glyphMap,
  ) => (
    <Pressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={active ? adminColors.primary : colors.textSecondary}
        />
      ) : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons
        name="chevron-down"
        size={12}
        color={active ? adminColors.primary : colors.textMuted}
      />
    </Pressable>
  );

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {history.length} {history.length === 1 ? 'entry' : 'entries'}
          {activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active` : ''}
        </Text>
        <View style={styles.summaryActions}>
          {activeFilterCount > 0 ? (
            <Pressable onPress={clearFilters} hitSlop={8}>
              <Text style={styles.clearLink}>Clear all</Text>
            </Pressable>
          ) : null}
          <View style={styles.viewToggle}>
            <Pressable
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleActive]}
              onPress={() => setViewMode('list')}
              accessibilityLabel="List view"
            >
              <Ionicons
                name="list-outline"
                size={16}
                color={viewMode === 'list' ? colors.white : colors.textSecondary}
              />
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, viewMode === 'cards' && styles.toggleActive]}
              onPress={() => setViewMode('cards')}
              accessibilityLabel="Card view"
            >
              <Ionicons
                name="grid-outline"
                size={16}
                color={viewMode === 'cards' ? colors.white : colors.textSecondary}
              />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContent}
      >
        {renderFilterChip(
          `Item: ${selectedItemName}`,
          filters.itemId !== null,
          () => setFilterModal('item'),
        )}
        {renderFilterChip(
          `Type: ${filters.actionType ? getActionLabel(filters.actionType) : 'All'}`,
          filters.actionType !== null,
          () => setFilterModal('type'),
        )}
        {renderFilterChip(
          dateFilterLabel,
          filters.dateFrom !== null || filters.dateTo !== null,
          () => setFilterModal('date'),
          'calendar-outline',
        )}
      </ScrollView>
    </View>
  );

  return (
    <RoleGuard requiredPermission="inventory.view">
      <AdminStateShell
        isLoading={isLoading && sections.length === 0}
        isError={!!error && sections.length === 0}
        errorMessage={error ?? undefined}
        onRetry={refresh}
        loadingRows={8}
      >
        <AdminScreenLayout>
        <SectionList
          sections={sections}
          keyExtractor={(entry) => entry.id}
          stickySectionHeadersEnabled
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.25}
          ListHeaderComponent={listHeader}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.dateHeader}>{section.title}</Text>
              <Text style={styles.sectionCount}>
                {section.data.length} {section.data.length === 1 ? 'event' : 'events'}
              </Text>
            </View>
          )}
          renderItem={({ item, index, section }) => {
            if (viewMode === 'cards') {
              return <HistoryCard entry={item} />;
            }
            const isFirst = index === 0;
            const isLast = index === section.data.length - 1;
            return (
              <View
                style={[
                  styles.listGroupItem,
                  isFirst && styles.listGroupFirst,
                  isLast && styles.listGroupLast,
                ]}
              >
                <HistoryListRow entry={item} showDivider={!isLast} />
              </View>
            );
          }}
          ListEmptyComponent={
            <AdminEmptyState
              title="No history found"
              subtitle={activeFilterCount > 0 ? 'Try changing or clearing your filters' : 'Stock changes will appear here'}
              iconName="time-outline"
              actionLabel={activeFilterCount > 0 ? 'Clear Filters' : undefined}
              onAction={activeFilterCount > 0 ? clearFilters : undefined}
            />
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <SkeletonLoader rows={2} />
              </View>
            ) : !hasMore && history.length > 0 ? (
              <Text style={styles.endText}>End of history</Text>
            ) : null
          }
          contentContainerStyle={sections.length === 0 ? styles.emptyList : styles.listContent}
        />

        <Modal visible={filterModal === 'item'} transparent animationType="slide">
          <Pressable style={styles.modalBackdrop} onPress={() => setFilterModal(null)}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Filter by Item</Text>
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator>
                <Pressable
                  style={[styles.modalOption, !filters.itemId && styles.modalOptionActive]}
                  onPress={() => {
                    setFilters({ ...filters, itemId: null });
                    setFilterModal(null);
                  }}
                >
                  <Text style={styles.modalOptionText}>All Items</Text>
                  {!filters.itemId ? (
                    <Ionicons name="checkmark" size={18} color={adminColors.primary} />
                  ) : null}
                </Pressable>
                {items.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[styles.modalOption, filters.itemId === item.id && styles.modalOptionActive]}
                    onPress={() => {
                      setFilters({ ...filters, itemId: item.id });
                      setFilterModal(null);
                    }}
                  >
                    <View style={styles.modalOptionContent}>
                      <Text style={styles.modalOptionText}>{item.name}</Text>
                      {item.sku ? (
                        <Text style={styles.modalOptionSub}>{item.sku}</Text>
                      ) : null}
                    </View>
                    {filters.itemId === item.id ? (
                      <Ionicons name="checkmark" size={18} color={adminColors.primary} />
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        <Modal visible={filterModal === 'type'} transparent animationType="slide">
          <Pressable style={styles.modalBackdrop} onPress={() => setFilterModal(null)}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Filter by Action Type</Text>
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator>
                {ACTION_TYPES.map((type) => {
                  const isSelected = type === 'all' ? !filters.actionType : filters.actionType === type;
                  const iconName =
                    type === 'all'
                      ? 'list-outline'
                      : (getActionIcon(type) as keyof typeof Ionicons.glyphMap);
                  return (
                    <Pressable
                      key={type}
                      style={[styles.modalOption, isSelected && styles.modalOptionActive]}
                      onPress={() => {
                        setFilters({
                          ...filters,
                          actionType: type === 'all' ? null : type,
                        });
                        setFilterModal(null);
                      }}
                    >
                      <View style={styles.modalOptionRow}>
                        <Ionicons
                          name={iconName}
                          size={18}
                          color={type === 'all' ? colors.textSecondary : getActionIconColor(type)}
                        />
                        <Text style={styles.modalOptionText}>
                          {type === 'all' ? 'All actions' : getActionLabel(type)}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark" size={18} color={adminColors.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        <Modal visible={filterModal === 'date'} transparent animationType="slide">
          <Pressable style={styles.modalBackdrop} onPress={() => setFilterModal(null)}>
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Date Range</Text>
              <DateRangePicker
                from={dateFrom}
                to={dateTo}
                onFromChange={(from) => {
                  setDateFrom(from);
                  setFilters({
                    ...filters,
                    dateFrom: from ? new Date(from) : null,
                    dateTo: dateTo ? new Date(dateTo) : null,
                  });
                }}
                onToChange={(to) => {
                  setDateTo(to);
                  setFilters({
                    ...filters,
                    dateFrom: dateFrom ? new Date(dateFrom) : null,
                    dateTo: to ? new Date(to) : null,
                  });
                }}
                accentColor={adminColors.primary}
              />
              <View style={styles.modalActions}>
                <AdminButton
                  label="Clear dates"
                  variant="ghost"
                  onPress={() => {
                    setDateFrom('');
                    setDateTo('');
                    setFilters({ ...filters, dateFrom: null, dateTo: null });
                  }}
                />
                <AdminButton label="Done" onPress={() => setFilterModal(null)} />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </AdminScreenLayout>
      </AdminStateShell>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  headerRefreshBtn: { marginRight: spacing.sm },
  listHeader: {
    backgroundColor: adminColors.canvasBg,
    paddingBottom: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  summaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toggleActive: {
    backgroundColor: adminColors.primary,
  },
  summaryText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  clearLink: { fontSize: 13, color: adminColors.primary, fontWeight: '600' },
  chipsContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.surfaceWhite,
    maxWidth: 220,
  },
  chipActive: {
    borderColor: adminColors.primary,
    backgroundColor: adminColors.primaryTint,
  },
  chipText: { fontSize: 13, color: colors.textPrimary, flexShrink: 1 },
  chipTextActive: { color: adminColors.primary, fontWeight: '600' },
  listContent: { paddingBottom: spacing.xl },
  emptyList: { flexGrow: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: adminColors.canvasBg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  dateHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionCount: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  listGroupItem: {
    backgroundColor: adminColors.cardBg,
    marginHorizontal: spacing.md,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderDefault,
  },
  listGroupFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
  listGroupLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    marginBottom: spacing.sm,
  },
  footerLoader: { paddingVertical: spacing.md },
  endText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
    paddingVertical: spacing.lg,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    maxHeight: '75%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderDefault,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm, color: colors.textPrimary },
  modalScroll: { maxHeight: 360 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalOptionActive: { backgroundColor: adminColors.primaryTint },
  modalOptionContent: { flex: 1 },
  modalOptionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  modalOptionText: { fontSize: 15, color: colors.textPrimary },
  modalOptionSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
});
