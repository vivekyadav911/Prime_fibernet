import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@prime/ui';

import { RoleGuard, SearchBar, StatusBadge } from '@/components/admin';
import { SaveButton, SettingsHubLayout, SettingsRow, SettingsSection } from '@/components/admin/settings';
import { ErrorState, SkeletonLoader } from '@/components/common';
import {
  useForceOfficerLogoutMutation,
  useGetAdminOfficersQuery,
  useResetOfficerPasswordMutation,
} from '@/store/api/endpoints';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminOfficerDetail } from '@/types/api/admin';
import { queryErrorMessage } from '@/utils/queryError';

function passwordLabel(officer: AdminOfficerDetail): string {
  if (officer.accountStatus === 'inactive') return 'inactive';
  if (officer.isBlocked) return 'blocked';
  return 'active';
}

export function SecurityScreen() {
  const dispatch = useAppDispatch();
  const [includeInactive, setIncludeInactive] = useState(false);
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error, refetch } = useGetAdminOfficersQuery({
    accountStatus: includeInactive ? 'all' : 'active',
  });
  const [resetPassword] = useResetOfficerPasswordMutation();
  const [forceLogout] = useForceOfficerLogoutMutation();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q),
    );
  }, [data, search]);

  const onMenu = useCallback(
    (officer: AdminOfficerDetail) => {
      Alert.alert(officer.name, 'Choose an action', [
        {
          text: 'Reset password',
          onPress: async () => {
            try {
              const result = await resetPassword({ officerId: officer.id }).unwrap();
              Alert.alert('Password reset', `Temporary password: ${result.password}`);
            } catch (e) {
              dispatch(enqueueToast({ id: Date.now().toString(), type: 'error', message: queryErrorMessage(e) }));
            }
          },
        },
        {
          text: 'Force logout',
          onPress: async () => {
            try {
              await forceLogout({ officerId: officer.id }).unwrap();
              dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'Logout recorded for officer' }));
            } catch (e) {
              dispatch(enqueueToast({ id: Date.now().toString(), type: 'error', message: queryErrorMessage(e) }));
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [dispatch, forceLogout, resetPassword],
  );

  const renderItem = useCallback(
    ({ item }: { item: AdminOfficerDetail }) => (
        <View style={styles.row}>
          <View style={styles.rowMain}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <StatusBadge status={passwordLabel(item)} />
          </View>
          <Pressable onPress={() => onMenu(item)} style={styles.menuBtn}>
            <Text style={styles.menuIcon}>···</Text>
          </Pressable>
        </View>
      ),
    [onMenu],
  );

  const body = isLoading ? (
    <SkeletonLoader rows={6} />
  ) : isError ? (
    <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
  ) : (
    <>
      <SettingsSection title="Officer Password Management">
        <SettingsRow
          label="Include inactive / resigned officers"
          value={includeInactive}
          onValueChange={setIncludeInactive}
        />
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, email, or ID" />
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          scrollEnabled={false}
          ListEmptyComponent={<Text style={styles.empty}>No officers found</Text>}
        />
      </SettingsSection>
      <SaveButton label="Save Security Settings" onPress={() => dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'Security settings saved' }))} />
    </>
  );

  return (
    <RoleGuard requiredPermission="settings.view">
      <Screen style={adminScreenStyles.canvas}>
        <SettingsHubLayout activeRoute="Security">
          <ScrollView contentContainerStyle={styles.content}>{body}</ScrollView>
        </SettingsHubLayout>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderDefault,
  },
  rowMain: { flex: 1, gap: 4 },
  name: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  email: { fontSize: 13, color: colors.textSecondary },
  menuBtn: { padding: spacing.sm },
  menuIcon: { fontSize: 20, fontWeight: '700', color: colors.textSecondary },
  empty: { padding: spacing.md, color: colors.textSecondary, textAlign: 'center' },
});
