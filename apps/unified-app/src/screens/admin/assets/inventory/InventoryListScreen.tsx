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
import { Button, Screen } from '@prime/ui';

import {
  FilterBar,
  InventoryCard,
  InventoryTableRow,
  StatCard,
} from '@/components/Inventory';
import { AdminEmptyState, RoleGuard, SearchBar } from '@/components/admin';
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

  if (isLoading && filteredItems.length === 0) {
    return (
      <RoleGuard requiredPermission="inventory.view">
        <Screen padded={false}>
          <SkeletonLoader rows={8} />
        </Screen>
      </RoleGuard>
    );
  }

  if (error && filteredItems.length === 0) {
    return (
      <RoleGuard requiredPermission="inventory.view">
        <Screen>
          <ErrorState message={error} onRetry={refresh} />
        </Screen>
      </RoleGuard>
    );
  }

  const emptyMessage = filters.searchQuery
    ? { title: 'No items match your search', action: 'Clear Search', onAction: clearSearch }
    : filters.categoryId || filters.stockStatus
      ? { title: 'No items in this category/status', action: 'Clear Filters', onAction: clearAllFilters }
      : { title: 'No inventory items yet', subtitle: 'Add your first item to get started', action: 'Add Item', onAction: () => navigation.navigate('AddItem') };

  return (
    <RoleGuard requiredPermission="inventory.view">
      <Screen padded={false} style={adminScreenStyles.canvas}>
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

        <ScrollView
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
          stickyHeaderIndices={[2]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
            <View style={styles.statsRow}>
              <StatCard icon="archive-outline" iconColor="#3B82F6" iconBgColor="#EFF6FF" value={stats.totalItems} label="Total Items" valueColor="#3B82F6" />
              <StatCard icon="infinite-outline" iconColor="#10B981" iconBgColor="#F0FDF4" value={stats.totalStock} label="Total Stock" valueColor="#10B981" />
              <StatCard icon="warning-outline" iconColor="#F59E0B" iconBgColor="#FFFBEB" value={stats.lowStockCount} label="Low Stock" valueColor="#F59E0B" />
              <StatCard icon="remove-circle-outline" iconColor="#EF4444" iconBgColor="#FEF2F2" value={stats.outOfStockCount} label="Out of Stock" valueColor="#EF4444" />
            </View>
          </ScrollView>

          <View style={styles.searchWrap}>
            <SearchBar value={filters.searchQuery} onChangeText={handleSearch} placeholder="Search by name, SKU, brand, model..." />
          </View>

          <View style={styles.stickyHeader}>
            <FilterBar
              categories={categories}
              filters={filters}
              onFiltersChange={setFilters}
            />
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

          {filteredItems.length === 0 ? (
            <AdminEmptyState
              title={emptyMessage.title}
              subtitle={emptyMessage.subtitle}
              actionLabel={emptyMessage.action}
              onAction={emptyMessage.onAction}
            />
          ) : viewMode === 'grid' ? (
            <FlatList
              data={filteredItems}
              keyExtractor={(i) => i.id}
              numColumns={numColumns}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <InventoryCard item={item} onPress={goDetail} />
              )}
            />
          ) : (
            <View>
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
              {filteredItems.map((item) => (
                <InventoryTableRow
                  key={item.id}
                  item={item}
                  isSelected={selectedIds.has(item.id)}
                  onSelect={toggleSelect}
                  onPress={goDetail}
                  onQuickAction={goQuickAction}
                  onEdit={goEdit}
                />
              ))}
            </View>
          )}

          {selectedIds.size > 0 ? (
            <View style={styles.bulkBar}>
              <Text style={styles.bulkText}>{selectedIds.size} selected</Text>
              <Button
                label="Bulk Operations"
                variant="secondary"
                onPress={() => navigation.navigate('BulkOperations')}
              />
            </View>
          ) : null}
        </ScrollView>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
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
  statsScroll: { marginTop: spacing.sm },
  statsRow: { flexDirection: 'row', paddingHorizontal: spacing.sm, minWidth: '100%' },
  searchWrap: { paddingHorizontal: spacing.md, marginTop: spacing.md },
  stickyHeader: { backgroundColor: adminColors.canvasBg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  sectionActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1B4B',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: 4,
  },
  addBtnText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
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
    padding: spacing.md,
    backgroundColor: colors.surfaceWhite,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
  },
  bulkText: { fontSize: 14, fontWeight: '600', color: adminColors.primary },
});
