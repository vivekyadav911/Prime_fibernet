import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppSelector } from '@/store/hooks';
import { hasPermission, resolveAdminRole, type AdminPermission } from '@/utils/adminPermissions';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type RoleGuardProps = {
  requiredPermission: AdminPermission;
  children: ReactNode;
  fallback?: ReactNode;
};

export function RoleGuard({ requiredPermission, children, fallback }: RoleGuardProps) {
  const user = useAppSelector((s) => s.auth.user);
  const role = resolveAdminRole(user?.role);
  const allowed = hasPermission(role, requiredPermission);

  if (allowed) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <View style={styles.denied}>
      <Text style={styles.text}>You do not have permission to view this section.</Text>
    </View>
  );
}

export function useAdminPermission(permission: AdminPermission): boolean {
  const user = useAppSelector((s) => s.auth.user);
  return hasPermission(resolveAdminRole(user?.role), permission);
}

const styles = StyleSheet.create({
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  text: { color: colors.textSecondary, textAlign: 'center' },
});
