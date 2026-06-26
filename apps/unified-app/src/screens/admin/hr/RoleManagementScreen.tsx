import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Button, Screen } from '@prime/ui';

import { RoleGuard, SectionCard } from '@/components/admin';
import { ErrorState, SkeletonLoader, ToggleSwitch } from '@/components/common';
import { useGetAdminRolesQuery, useUpdateRolePermissionsMutation } from '@/store/api/endpoints';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

const MODULES = ['users', 'officers', 'requests', 'plans', 'payments', 'settings'];
const ACTIONS = ['view', 'create', 'edit', 'delete'];

export function RoleManagementScreen() {
  const { data: roles, isLoading, isError, error, refetch } = useGetAdminRolesQuery();
  const [updatePerms] = useUpdateRolePermissionsMutation();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});

  const role = roles?.find((r) => r.id === selectedRole) ?? roles?.[0];

  const toggle = (mod: string, action: string) => {
    setPermissions((prev) => ({
      ...prev,
      [mod]: { ...prev[mod], [action]: !prev[mod]?.[action] },
    }));
  };

  const onSave = async () => {
    if (!role) return;
    try {
      await updatePerms({ roleId: role.id, permissions }).unwrap();
      Alert.alert('Saved', 'Role permissions updated.');
      refetch();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save');
    }
  };

  if (isLoading) {
    return (
      <Screen padded={false} safeAreaTop={false} style={adminScreenStyles.canvas}>
        <SkeletonLoader rows={6} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen padded={false} safeAreaTop={false} style={adminScreenStyles.canvas}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  const perms = Object.keys(permissions).length ? permissions : role?.permissions ?? {};

  return (
    <RoleGuard requiredPermission="roles.view">
      <Screen padded={false} safeAreaTop={false} style={adminScreenStyles.canvas}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[adminScreenStyles.listContent, styles.scrollContent]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.roleRow}
            keyboardShouldPersistTaps="handled"
          >
            {(roles ?? []).map((r) => (
              <Button
                key={r.id}
                label={r.name}
                variant={role?.id === r.id ? 'primary' : 'ghost'}
                onPress={() => {
                  setSelectedRole(r.id);
                  setPermissions(r.permissions);
                }}
              />
            ))}
          </ScrollView>
          <SectionCard title={`Permissions — ${role?.name ?? ''}`}>
            {MODULES.map((mod) => (
              <View key={mod} style={styles.modRow}>
                <Text style={styles.modLabel}>{mod}</Text>
                {ACTIONS.map((act) => (
                  <View key={act} style={styles.switchRow}>
                    <Text style={styles.actLabel}>{act}</Text>
                    <ToggleSwitch value={!!perms[mod]?.[act]} onValueChange={() => toggle(mod, act)} />
                  </View>
                ))}
              </View>
            ))}
          </SectionCard>
          <RoleGuard requiredPermission="roles.edit">
            <Button label="Save changes" onPress={() => void onSave()} />
          </RoleGuard>
        </ScrollView>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
  },
  roleRow: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  modRow: { marginBottom: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault, paddingBottom: spacing.sm },
  modLabel: { fontWeight: '700', textTransform: 'capitalize', marginBottom: spacing.xs },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  actLabel: { fontSize: 13, color: colors.textSecondary, textTransform: 'capitalize' },
});
