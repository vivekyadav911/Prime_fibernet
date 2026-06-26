import { useCallback, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@prime/ui';

import {
  PlanCard,
  PlanFilterBar,
  PlanFilterSheet,
  PlanListRow,
  PlanStatsBar,
} from '@/components/Plans';
import { AdminEmptyState, AdminScreenLayout, RoleGuard, SearchBar } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { scrollLayoutStyles } from '@/components/common/scrollLayoutStyles';
import { usePlans } from '@/hooks/usePlans';
import { getPlanDeactivationNotificationPrefill } from '@/services/planService';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminPlansStackParamList } from '@/types/navigation';
import type { Plan, PlanFilters } from '@/types/plans';

type Props = NativeStackScreenProps<AdminPlansStackParamList, 'PlanList'>;

const SORT_OPTIONS: { value: PlanFilters['sortBy']; label: string }[] = [
  { value: 'sort_order', label: 'Default' },
  { value: 'price_asc', label: 'Price: Low→High' },
  { value: 'price_desc', label: 'Price: High→Low' },
  { value: 'speed_asc', label: 'Speed: Low→High' },
  { value: 'speed_desc', label: 'Speed: High→Low' },
  { value: 'subscribers', label: 'Most Subscribers' },
  { value: 'newest', label: 'Newest First' },
];

function useNumColumns() {
  const { width } = Dimensions.get('window');
  return width >= 768 ? 3 : 2;
}

export function PlansScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const numColumns = useNumColumns();
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const {
    plans,
    allPlans,
    stats,
    filters,
    updateFilters,
    resetFilters,
    viewMode,
    setViewMode,
    loading,
    refreshing,
    onRefresh,
    error,
    togglePlanStatus,
    deletePlan,
    duplicatePlan,
  } = usePlans();

  const handleSearchDebounced = useMemo(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return (text: string) => {
      setSearchInput(text);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => updateFilters({ searchQuery: text }), 300);
    };
  }, [updateFilters]);

  const showSortPicker = useCallback(() => {
    const options = [...SORT_OPTIONS.map((o) => o.label), 'Cancel'];
    const cancelIndex = options.length - 1;

    const onSelect = (index: number) => {
      if (index >= 0 && index < SORT_OPTIONS.length) {
        updateFilters({ sortBy: SORT_OPTIONS[index]!.value });
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: cancelIndex }, onSelect);
    } else {
      Alert.alert('Sort by', undefined, [
        ...SORT_OPTIONS.map((opt, i) => ({
          text: opt.label,
          onPress: () => onSelect(i),
        })),
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [updateFilters]);

  const handleRemoveFilter = useCallback(
    (key: keyof PlanFilters | 'speed' | 'price') => {
      if (key === 'status') updateFilters({ status: 'all' });
      else if (key === 'speed') updateFilters({ speedMin: null, speedMax: null });
      else if (key === 'price') updateFilters({ priceMin: null, priceMax: null });
      else if (key === 'category') updateFilters({ category: 'all' });
      else if (key === 'validityDays') updateFilters({ validityDays: null });
    },
    [updateFilters],
  );

  const handleEdit = useCallback(
    (plan: Plan) => {
      navigation.navigate('PlanForm', { mode: 'edit', planId: plan.id });
    },
    [navigation],
  );

  const handleCreate = useCallback(() => {
    navigation.navigate('PlanForm', { mode: 'create' });
  }, [navigation]);

  const handleToggle = useCallback(
    async (plan: Plan, isActive: boolean) => {
      const applyToggle = async () => {
        try {
          await togglePlanStatus(plan.id, isActive);
        } catch (e) {
          dispatch(
            enqueueToast({
              id: `plan-toggle-${Date.now()}`,
              type: 'error',
              message: e instanceof Error ? e.message : 'Could not update plan',
            }),
          );
          throw e;
        }
      };

      if (!isActive && plan.subscriberCount > 0) {
        Alert.alert(
          'Notify subscribers?',
          `Would you like to notify ${plan.subscriberCount} subscriber${plan.subscriberCount === 1 ? '' : 's'} about this plan change?`,
          [
            {
              text: 'Skip',
              style: 'cancel',
              onPress: () => {
                void applyToggle();
              },
            },
            {
              text: 'Notify',
              onPress: () => {
                void applyToggle().then(() => {
                  navigation.getParent()?.navigate('Notifications', {
                    screen: 'CreateNotification',
                    params: {
                      mode: 'create',
                      prefill: getPlanDeactivationNotificationPrefill(
                        plan.id,
                        plan.displayName,
                        plan.subscriberCount,
                      ),
                    },
                  });
                });
              },
            },
          ],
        );
        return;
      }

      await applyToggle();
    },
    [dispatch, navigation, togglePlanStatus],
  );

  const handleDuplicate = useCallback(
    async (plan: Plan, displayName: string, planTag: string) => {
      try {
        const created = await duplicatePlan(plan.id, displayName, planTag);
        dispatch(
          enqueueToast({
            id: `plan-dup-${Date.now()}`,
            type: 'success',
            message: `Plan duplicated — '${created.displayName}' created`,
          }),
        );
      } catch (e) {
        dispatch(
          enqueueToast({
            id: `plan-dup-err-${Date.now()}`,
            type: 'error',
            message: e instanceof Error ? e.message : 'Could not duplicate plan',
          }),
        );
        throw e;
      }
    },
    [dispatch, duplicatePlan],
  );

  const handleDelete = useCallback(
    async (plan: Plan) => {
      try {
        await deletePlan(plan.id);
        dispatch(
          enqueueToast({
            id: `plan-del-${Date.now()}`,
            type: 'success',
            message: 'Plan deleted',
          }),
        );
      } catch (e) {
        dispatch(
          enqueueToast({
            id: `plan-del-err-${Date.now()}`,
            type: 'error',
            message: e instanceof Error ? e.message : 'Could not delete plan',
          }),
        );
        throw e;
      }
    },
    [deletePlan, dispatch],
  );

  const handleMigrate = useCallback(
    (plan: Plan) => {
      const root = navigation.getParent();
      if (root) {
        root.navigate('Users', { screen: 'UserList', params: { planId: plan.id } });
      }
    },
    [navigation],
  );

  const renderGridItem = useCallback(
    ({ item }: { item: Plan }) => (
      <PlanCard
        plan={item}
        onEdit={handleEdit}
        onToggleStatus={handleToggle}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onMigrate={handleMigrate}
      />
    ),
    [handleDelete, handleDuplicate, handleEdit, handleMigrate, handleToggle],
  );

  const renderListItem = useCallback(
    ({ item }: { item: Plan }) => (
      <PlanListRow
        plan={item}
        onEdit={handleEdit}
        onToggleStatus={handleToggle}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onMigrate={handleMigrate}
      />
    ),
    [handleDelete, handleDuplicate, handleEdit, handleMigrate, handleToggle],
  );

  const listHeader = useMemo(
    () => (
      <>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="wifi-outline" size={28} color={adminColors.primary} />
            <View>
              <Text style={styles.title}>Plans</Text>
              <Text style={styles.subtitle}>{stats.totalPlans} plans</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Pressable style={styles.iconBtn} onPress={onRefresh}>
              <Ionicons name="refresh-outline" size={22} color={colors.textSecondary} />
            </Pressable>
            <Button label="+ New Plan" onPress={handleCreate} />
          </View>
        </View>

        <PlanStatsBar stats={stats} />

        <View style={styles.toolbar}>
          <View style={styles.viewToggle}>
            <Pressable
              style={[styles.toggleBtn, viewMode === 'grid' ? styles.toggleActive : null]}
              onPress={() => setViewMode('grid')}
            >
              <Ionicons
                name="grid-outline"
                size={18}
                color={viewMode === 'grid' ? colors.white : colors.textSecondary}
              />
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, viewMode === 'list' ? styles.toggleActive : null]}
              onPress={() => setViewMode('list')}
            >
              <Ionicons
                name="list-outline"
                size={18}
                color={viewMode === 'list' ? colors.white : colors.textSecondary}
              />
            </Pressable>
          </View>
          <SearchBar
            value={searchInput}
            onChangeText={handleSearchDebounced}
            placeholder="Search plans..."
            containerStyle={styles.search}
          />
          <Pressable style={styles.iconBtn} onPress={showSortPicker}>
            <Ionicons name="funnel-outline" size={20} color={colors.textSecondary} />
          </Pressable>
          <Button label="+ New" onPress={handleCreate} />
        </View>

        <PlanFilterBar
          filters={filters}
          shownCount={plans.length}
          onRemoveFilter={handleRemoveFilter}
          onOpenSheet={() => setFilterSheetVisible(true)}
        />
      </>
    ),
    [
      filters,
      handleCreate,
      onRefresh,
      plans.length,
      searchInput,
      showSortPicker,
      stats,
      updateFilters,
      viewMode,
      setViewMode,
      handleRemoveFilter,
    ],
  );

  if (loading && !refreshing) {
    return (
      <RoleGuard requiredPermission="plans.view">
        <AdminScreenLayout>
          <SkeletonLoader rows={4} shape="card" />
        </AdminScreenLayout>
      </RoleGuard>
    );
  }

  if (error && !allPlans.length) {
    return (
      <RoleGuard requiredPermission="plans.view">
        <AdminScreenLayout>
          <ErrorState message={error} onRetry={onRefresh} />
        </AdminScreenLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard requiredPermission="plans.view">
      <AdminScreenLayout>
        {viewMode === 'grid' ? (
          <FlatList
            key={`grid-${numColumns}`}
            style={scrollLayoutStyles.scrollContainer}
            data={plans}
            numColumns={numColumns}
            keyExtractor={(item) => item.id}
            renderItem={renderGridItem}
            ListHeaderComponent={listHeader}
            contentContainerStyle={adminScreenStyles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <AdminEmptyState
                title="No plans found"
                iconName="cellular-outline"
                actionLabel={allPlans.length ? 'Clear all filters' : '+ Create your first plan'}
                onAction={
                  allPlans.length
                    ? () => {
                        resetFilters();
                        setSearchInput('');
                      }
                    : handleCreate
                }
              />
            }
          />
        ) : (
          <FlatList
            key="list"
            style={scrollLayoutStyles.scrollContainer}
            data={plans}
            keyExtractor={(item) => item.id}
            renderItem={renderListItem}
            ListHeaderComponent={listHeader}
            contentContainerStyle={adminScreenStyles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <AdminEmptyState
                title="No plans found"
                iconName="cellular-outline"
                actionLabel={allPlans.length ? 'Clear all filters' : '+ Create your first plan'}
                onAction={
                  allPlans.length
                    ? () => {
                        resetFilters();
                        setSearchInput('');
                      }
                    : handleCreate
                }
              />
            }
          />
        )}

        <PlanFilterSheet
          visible={filterSheetVisible}
          filters={filters}
          allPlans={allPlans}
          onClose={() => setFilterSheetVisible(false)}
          onApply={(partial) => updateFilters(partial)}
          onClear={() => {
            resetFilters();
            setSearchInput('');
          }}
        />
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  viewToggle: { flexDirection: 'row', gap: 2 },
  toggleBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWhite,
  },
  toggleActive: { backgroundColor: adminColors.primary },
  search: { flex: 1 },
});
