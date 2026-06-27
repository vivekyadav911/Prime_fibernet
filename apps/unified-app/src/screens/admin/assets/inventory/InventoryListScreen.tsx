import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@prime/ui';

import {
  FilterBar,
  InventoryCard,
  InventoryTableRow,
  StatCard,
} from '@/components/Inventory';
import { AdminScreenLayout, AdminEmptyState, RoleGuard, SearchBar } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useInventory } from '@/hooks/useInventory';
import { fetchCategories } from '@/services/inventoryService';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminInventoryStackParamList } from '@/types/navigation';
import type { InventoryCategory, InventoryItem } from '@/types/inventory';

type Props = NativeStackScreenProps<AdminInventoryStackParamList, 'InventoryList'>;

function useNumColumns() {
  const { width } = Dimensions.get('window');
  return width >= 768 ? 3 : 2;
}

export function InventoryListScreen({ navigation }: Props) {
  const numColumns = useNumColumns();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [activeTab, setActiveTab] = useState<'requests' | 'history'>('requests');
  const [categories, setCategories] = useState<InventoryCategory[]>([]);

  useEffect(() => {
    void fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const {
    filteredItems,
    stats,
    filters,
    isLoading,
    error,
    selectedIds,
    setFilters,
    toggleSelect,
    selectAll,
    clearSelection,
    refresh,
  } = useInventory();

  const allSelected = useMemo(
    () => filteredItems.length > 0 && filteredItems.every((i) => selectedIds.has(i.id)),
    [filteredItems, selectedIds],
  );

  const handleSearch = useCallback(
    (text: string) => setFilters({ ...filters, searchQuery: text }),
    [filters, setFilters],
  );

  const clearSearch = useCallback(() => {
    setFilters({ ...filters, searchQuery: '' });
  }, [filters, setFilters]);

  const clearAllFilters = useCallback(() => {
    setFilters({ searchQuery: '', categoryId: null, stockStatus: null });
  }, [setFilters]);

  const goDetail = useCallback(
    (item: InventoryItem) => navigation.navigate('ItemDetail', { itemId: item.id }),
    [navigation],
  );

  const goQuickAction = useCallback(
    (item: InventoryItem) => navigation.navigate('QuickAction', { itemId: item.id }),
    [navigation],
  );

  const goEdit = useCallback(
    (item: InventoryItem) => navigation.navigate('EditItem', { itemId: item.id }),
    [navigation],
  );

  const emptyMessage = filters.searchQuery
    ? { title: 'No items match your search', action: 'Clear Search', onAction: clearSearch }
    : filters.categoryId || filters.stockStatus
      ? { title: 'No items in this category/status', action: 'Clear Filters', onAction: clearAllFilters }
      : {
          title: 'No inventory items yet',
          subtitle: 'Add your first item to get started',
          action: 'Add Item',
          onAction: () => navigation.navigate('AddItem'),
        };

  const renderItem = useCallback(
    ({ item }: { item: InventoryItem }) =>
      viewMode === 'grid' ? (
        <InventoryCard item={item} onPress={goDetail} />
      ) : (
        <InventoryTableRow
          item={item}
          isSelected={selectedIds.has(item.id)}
          onSelect={toggleSelect}
          onPress={goDetail}
          onQuickAction={goQuickAction}
          onEdit={goEdit}
        />
      ),
    [goDetail, goEdit, goQuickAction, selectedIds, toggleSelect, viewMode],
  );

  const listHeader = (
    <View style={adminScreenStyles.listHeader}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <StatCard icon="archive-outline" iconColor={adminColors.inventoryStat.total.iconColor} iconBgColor={adminColors.inventoryStat.total.iconBgColor} value={stats.totalItems} label="Total Items" valueColor={adminColors.inventoryStat.total.valueColor} />
          <StatCard icon="infinite-outline" iconColor={adminColors.inventoryStat.stock.iconColor} iconBgColor={adminColors.inventoryStat.stock.iconBgColor} value={stats.totalStock} label="Total Stock" valueColor={adminColors.inventoryStat.stock.valueColor} />
          <StatCard icon="warning-outline" iconColor={adminColors.inventoryStat.low.iconColor} iconBgColor={adminColors.inventoryStat.low.iconBgColor} value={stats.lowStockCount} label="Low Stock" valueColor={adminColors.inventoryStat.low.valueColor} />
          <StatCard icon="remove-circle-outline" iconColor={adminColors.inventoryStat.out.iconColor} iconBgColor={adminColors.inventoryStat.out.iconBgColor} value={stats.outOfStockCount} label="Out of Stock" valueColor={adminColors.inventoryStat.out.valueColor} />
        </View>
      </ScrollView>

      <SearchBar value={filters.searchQuery} onChangeText={handleSearch} placeholder="Search by name, SKU, brand, model..." />

      <View style={styles.filtersBlock}>
        <FilterBar categories={categories} filters={filters} onFiltersChange={setFilters} />
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Inventory Items ({filteredItems.length})</Text>
          <View style={styles.sectionActions}>
            <Pressable onPress={() => setViewMode('grid')} hitSlop={8}>
              <Ionicons name="grid-outline" size={22} color={viewMode === 'grid' ? adminColors.primary : colors.textMuted} />
            </Pressable>
            <Pressable onPress={() => setViewMode('list')} hitSlop={8}>
              <Ionicons name="list-outline" size={22} color={viewMode === 'list' ? adminColors.primary : colors.textMuted} />
            </Pressable>
            <Pressable style={styles.addBtn} onPress={() => navigation.navigate('AddItem')}>
              <Ionicons name="add" size={16} color={colors.white} />
              <Text style={styles.addBtnText}>Add Item</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {viewMode === 'list' && filteredItems.length > 0 ? (
        <View style={styles.tableHeader}>
          <Pressable onPress={allSelected ? clearSelection : selectAll} hitSlop={8}>
            <Ionicons
              name={allSelected ? 'checkbox' : 'square-outline'}
              size={18}
              color={adminColors.primary}
            />
          </Pressable>
          <Text style={[styles.th, { flex: 2 }]}>NAME</Text>
          <Text style={[styles.th, { flex: 1 }]}>SKU</Text>
          <Text style={styles.thSmall}>TOTAL</Text>
          <Text style={styles.thSmall}>AVAIL</Text>
          <Text style={[styles.th, { width: 90 }]}>STATUS</Text>
          <Text style={[styles.th, { width: 56 }]}>ACTIONS</Text>
        </View>
      ) : null}
    </View>
  );

  const listFooter =
    selectedIds.size > 0 ? (
      <View style={styles.bulkBar}>
        <Text style={styles.bulkText}>{selectedIds.size} selected</Text>
        <Button
          label="Bulk Operations"
          variant="secondary"
          onPress={() => navigation.navigate('BulkOperations')}
        />
      </View>
    ) : null;

  if (isLoading && filteredItems.length === 0) {
    return (
      <RoleGuard requiredPermission="inventory.view">
        <AdminScreenLayout>
          <SkeletonLoader rows={8} />
        </AdminScreenLayout>
      </RoleGuard>
    );
  }

  if (error && filteredItems.length === 0) {
    return (
      <RoleGuard requiredPermission="inventory.view">
        <AdminScreenLayout>
          <ErrorState message={error} onRetry={refresh} />
        </AdminScreenLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard requiredPermission="inventory.view">
      <AdminScreenLayout padded={false}>
        <View style={styles.page}>
          <View style={styles.tabBar}>
            <Pressable
              style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
              onPress={() => setActiveTab('requests')}
            >
              <Ionicons name="clipboard-outline" size={16} color={activeTab === 'requests' ? adminColors.primary : colors.textSecondary} />
              <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
                Inventory ({filteredItems.length})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'history' && styles.tabActive]}
              onPress={() => navigation.navigate('InventoryHistory')}
            >
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.tabText}>History</Text>
            </Pressable>
          </View>

          <FlatList
            data={filteredItems}
            key={`${viewMode}-${numColumns}`}
            keyExtractor={(i) => i.id}
            numColumns={viewMode === 'grid' ? numColumns : 1}
            renderItem={renderItem}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={
              <AdminEmptyState
                title={emptyMessage.title}
                subtitle={emptyMessage.subtitle}
                actionLabel={emptyMessage.action}
                onAction={emptyMessage.onAction}
              />
            }
            ListFooterComponent={listFooter}
            columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
            contentContainerStyle={[
              adminScreenStyles.listContent,
              filteredItems.length === 0 && styles.emptyList,
            ]}
            style={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  list: { flex: 1 },
  emptyList: { flexGrow: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: adminColors.primary },
  tabText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: adminColors.primary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  filtersBlock: { gap: spacing.xs },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: adminColors.ctaDark,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: 4,
  },
  addBtnText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  gridRow: { gap: spacing.xs },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: adminColors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  th: { fontSize: 12, fontWeight: '500', color: colors.textSecondary, textTransform: 'uppercase' },
  thSmall: { width: 40, fontSize: 12, fontWeight: '500', color: colors.textSecondary, textTransform: 'uppercase', textAlign: 'center' },
  bulkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceWhite,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    marginTop: spacing.sm,
  },
  bulkText: { fontSize: 14, fontWeight: '600', color: adminColors.primary },
});
