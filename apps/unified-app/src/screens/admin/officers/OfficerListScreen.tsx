import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import {
  AdminEmptyState,
  AdminKPICard,
  ConfirmModal,
  FilterChips,
  OfficerActionMenu,
  OfficerCard,
  RoleGuard,
  SearchBar,
  useAdminPermission,
  type OfficerMenuAction,
} from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { officerStrings } from '@/constants/officerStrings';
import {
  useBlockOfficerMutation,
  useDeleteOfficerMutation,
  useGetAdminOfficerStatsQuery,
  useGetAdminOfficersQuery,
  useUnblockOfficerMutation,
} from '@/store/api/endpoints';
import type { AdminOfficerDetail, OfficerAccountStatus } from '@/types/api/admin';
import type { AdminOfficersStackParamList } from '@/types/navigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminOfficersStackParamList, 'OfficerList'>;

type AccountFilter = 'all' | OfficerAccountStatus;

export function OfficerListScreen({ navigation }: Props) {
  const [search, setSearch] = useState('');
  const [accountStatus, setAccountStatus] = useState<AccountFilter>('all');
  const [menuTarget, setMenuTarget] = useState<AdminOfficerDetail | null>(null);
  const [blockTarget, setBlockTarget] = useState<AdminOfficerDetail | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminOfficerDetail | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fabOpacity = useRef(new Animated.Value(1)).current;
  const lastScrollY = useRef(0);

  const canCreate = useAdminPermission('officers.create');
  const canEdit = useAdminPermission('officers.edit');
  const canDelete = useAdminPermission('officers.delete');

  const { data: stats } = useGetAdminOfficerStatsQuery();
  const { data, isLoading, isError, error, refetch } = useGetAdminOfficersQuery({
    search: search || undefined,
    accountStatus,
  });
  const [blockOfficer, { isLoading: blocking }] = useBlockOfficerMutation();
  const [unblockOfficer, { isLoading: unblocking }] = useUnblockOfficerMutation();
  const [deleteOfficer, { isLoading: deleting }] = useDeleteOfficerMutation();

  const officers = useMemo(() => data ?? [], [data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleScroll = useCallback(
    (y: number) => {
      const diff = y - lastScrollY.current;
      if (diff > 8 && y > 40) {
        Animated.timing(fabOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      } else if (diff < -8) {
        Animated.timing(fabOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      }
      lastScrollY.current = y;
    },
    [fabOpacity],
  );

  const handleBlock = useCallback(async () => {
    if (!blockTarget) return;
    try {
      await blockOfficer({ officerId: blockTarget.id, reason: 'Blocked by admin' }).unwrap();
      setBlockTarget(null);
      Alert.alert('Officer blocked', `${blockTarget.name} has been restricted.`);
    } catch (e) {
      Alert.alert('Failed', queryErrorMessage(e));
    }
  }, [blockOfficer, blockTarget]);

  const handleUnblock = useCallback(async (officer: AdminOfficerDetail) => {
    try {
      await unblockOfficer({ officerId: officer.id }).unwrap();
      Alert.alert('Officer unblocked', `${officer.name} access restored.`);
    } catch (e) {
      Alert.alert('Failed', queryErrorMessage(e));
    }
  }, [unblockOfficer]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteOfficer({ officerId: deleteTarget.id }).unwrap();
      setDeleteTarget(null);
      Alert.alert('Deleted', `${deleteTarget.name} has been removed.`);
    } catch (e) {
      Alert.alert('Failed', queryErrorMessage(e));
    }
  }, [deleteOfficer, deleteTarget]);

  const menuActions = useMemo((): OfficerMenuAction[] => {
    if (!menuTarget) return [];
    const actions: OfficerMenuAction[] = [
      {
        key: 'view',
        label: officerStrings.actions.viewDetails,
        onPress: () => navigation.navigate('OfficerDetail', { officerId: menuTarget.id }),
      },
    ];
    if (canEdit) {
      actions.push({
        key: 'edit',
        label: officerStrings.actions.edit,
        onPress: () => navigation.navigate('OfficerEdit', { officerId: menuTarget.id }),
      });
      if (menuTarget.isBlocked) {
        actions.push({
          key: 'unblock',
          label: officerStrings.actions.unblock,
          onPress: () => void handleUnblock(menuTarget),
        });
      } else {
        actions.push({
          key: 'block',
          label: officerStrings.actions.block,
          onPress: () => setBlockTarget(menuTarget),
        });
      }
    }
    if (canDelete) {
      actions.push({
        key: 'delete',
        label: officerStrings.actions.delete,
        destructive: true,
        onPress: () => setDeleteTarget(menuTarget),
      });
    }
    return actions;
  }, [menuTarget, canEdit, canDelete, navigation, handleUnblock]);

  const renderItem = useCallback(
    ({ item }: { item: AdminOfficerDetail }) => (
      <OfficerCard
        officer={item}
        canManage={canEdit || canDelete}
        onViewDetails={() => navigation.navigate('OfficerDetail', { officerId: item.id })}
        onMenuPress={() => setMenuTarget(item)}
      />
    ),
    [canEdit, canDelete, navigation],
  );

  if (isLoading) return <Screen><SkeletonLoader rows={6} showAvatar /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="officers.view">
      <Screen padded={false} style={styles.screen}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiRow}
        >
          <AdminKPICard label={officerStrings.kpi.totalForce} value={stats?.total ?? 0} icon="👥" />
          <AdminKPICard label={officerStrings.kpi.activeStatus} value={stats?.active ?? 0} icon="⚡" />
          <AdminKPICard label={officerStrings.kpi.available} value={stats?.available ?? 0} icon="📅" />
          <AdminKPICard label={officerStrings.kpi.restricted} value={stats?.restricted ?? 0} icon="🚫" />
        </ScrollView>

        <View style={styles.toolbar}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder={officerStrings.list.searchPlaceholder}
            debounceMs={400}
          />
          <FilterChips
            options={[
              { value: 'all', label: officerStrings.filters.all },
              { value: 'active', label: officerStrings.filters.active },
              { value: 'inactive', label: officerStrings.filters.inactive },
              { value: 'blocked', label: officerStrings.filters.blocked },
            ]}
            selected={accountStatus}
            onSelect={(v) => setAccountStatus(v as AccountFilter)}
          />
        </View>

        {!officers.length ? (
          <AdminEmptyState
            title={officerStrings.list.emptyTitle}
            subtitle={officerStrings.list.emptySubtitle}
            icon="🛡️"
            actionLabel={canCreate ? officerStrings.list.addOfficer : undefined}
            onAction={canCreate ? () => navigation.navigate('AddOfficer') : undefined}
          />
        ) : (
          <FlatList
            data={officers}
            keyExtractor={(o) => o.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
            }
            onScroll={(e) => handleScroll(e.nativeEvent.contentOffset.y)}
            scrollEventThrottle={16}
          />
        )}

        {canCreate ? (
          <Animated.View style={[styles.fabWrap, { opacity: fabOpacity }]}>
            <Pressable
              style={styles.fab}
              onPress={() => navigation.navigate('AddOfficer')}
              accessibilityLabel={officerStrings.list.addOfficer}
            >
              <Text style={styles.fabText}>+</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        <OfficerActionMenu
          visible={!!menuTarget}
          onClose={() => setMenuTarget(null)}
          actions={menuActions}
        />

        <ConfirmModal
          visible={!!blockTarget}
          title={officerStrings.actions.blockConfirmTitle}
          message={officerStrings.actions.blockConfirmMessage(blockTarget?.name ?? 'this officer')}
          confirmLabel={blocking ? 'Blocking…' : officerStrings.actions.block}
          onConfirm={() => void handleBlock()}
          onCancel={() => setBlockTarget(null)}
        />

        <ConfirmModal
          visible={!!deleteTarget}
          title={officerStrings.actions.deleteConfirmTitle}
          message={officerStrings.actions.deleteConfirmMessage(deleteTarget?.name ?? 'this officer')}
          confirmLabel={deleting ? 'Deleting…' : officerStrings.actions.delete}
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: adminColors.canvasBg, flex: 1 },
  kpiRow: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  toolbar: { padding: spacing.sm, gap: spacing.sm },
  list: { paddingBottom: 96 },
  fabWrap: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: adminColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabText: { fontSize: 28, color: colors.surfaceWhite, fontWeight: '300', marginTop: -2 },
});
