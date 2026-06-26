import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import {
  AdminEmptyState,
  ConfirmModal,
  OfficerActionMenu,
  OfficerCard,
  RoleGuard,
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
import { queryErrorMessage } from '@/utils/queryError';

import { OfficerKpiCarousel } from './components/OfficerKpiCarousel';
import { OfficerSearchFilters } from './components/OfficerSearchFilters';
import { FAB_SIZE, OFFICER_CARD_GAP, ui } from './officersUi';

type Props = NativeStackScreenProps<AdminOfficersStackParamList, 'OfficerList'>;

type AccountFilter = 'all' | OfficerAccountStatus;

function ListSeparator() {
  return <View style={styles.listSeparator} />;
}

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
  const [unblockOfficer] = useUnblockOfficerMutation();
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

  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <OfficerKpiCarousel stats={stats} />
        <OfficerSearchFilters
          search={search}
          onSearchChange={setSearch}
          accountStatus={accountStatus}
          onAccountStatusChange={setAccountStatus}
        />
        {officers.length > 0 ? (
          <Text style={styles.listEyebrow}>
            {officers.length} officer{officers.length === 1 ? '' : 's'}
          </Text>
        ) : null}
      </View>
    ),
    [stats, search, accountStatus, officers.length],
  );

  if (isLoading) {
    return (
      <Screen padded={false} style={styles.screen}>
        <SkeletonLoader rows={6} showAvatar />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen padded={false} style={styles.screen}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <RoleGuard requiredPermission="officers.view">
      <Screen padded={false} safeAreaTop={false} style={styles.screen}>
        {!officers.length ? (
          <View style={styles.emptyWrap}>
            <View style={styles.pageInset}>{listHeader}</View>
            <AdminEmptyState
              title={officerStrings.list.emptyTitle}
              subtitle={officerStrings.list.emptySubtitle}
              icon="🛡️"
              actionLabel={canCreate ? officerStrings.list.addOfficer : undefined}
              onAction={canCreate ? () => navigation.navigate('AddOfficer') : undefined}
            />
          </View>
        ) : (
          <FlatList
            data={officers}
            keyExtractor={(o) => o.id}
            renderItem={renderItem}
            ListHeaderComponent={listHeader}
            ItemSeparatorComponent={ListSeparator}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
            }
            onScroll={(e) => handleScroll(e.nativeEvent.contentOffset.y)}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {canCreate ? (
          <Animated.View style={[styles.fabWrap, { opacity: fabOpacity }]}>
            <Pressable
              style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
              onPress={() => navigation.navigate('AddOfficer')}
              accessibilityLabel={officerStrings.list.addOfficer}
            >
              <Ionicons name="add" size={30} color="#FFFFFF" />
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
  screen: {
    backgroundColor: ui.bg,
    flex: 1,
  },
  headerBlock: {
    gap: ui.sectionGap,
    paddingTop: 12,
    paddingBottom: 4,
  },
  listEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: ui.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  list: {
    paddingHorizontal: ui.pagePad,
    paddingBottom: 104,
  },
  listSeparator: {
    height: OFFICER_CARD_GAP,
  },
  emptyWrap: {
    flex: 1,
    gap: ui.sectionGap,
  },
  pageInset: {
    paddingHorizontal: ui.pagePad,
  },
  fabWrap: {
    position: 'absolute',
    right: ui.pagePad,
    bottom: 24,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: ui.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ui.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  fabPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
});
