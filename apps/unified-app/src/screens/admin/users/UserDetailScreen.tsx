import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { AvatarIcon, RoleGuard, SectionCard, StatusBadge } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import {
  useGetAdminUserDetailQuery,
  useGetUserPaymentsQuery,
  useGetUserSubscriptionsQuery,
} from '@/store/api/endpoints';
import type { AdminUsersStackParamList } from '@/types/navigation';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminUsersStackParamList, 'UserDetail'>;

export function UserDetailScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const { data: user, isLoading, isError, error, refetch } = useGetAdminUserDetailQuery(userId);
  const { data: subs } = useGetUserSubscriptionsQuery(userId);
  const { data: payments } = useGetUserPaymentsQuery(userId);

  if (isLoading) return <Screen style={adminScreenStyles.canvas}><SkeletonLoader rows={6} showAvatar /></Screen>;
  if (isError || !user) return <Screen style={adminScreenStyles.canvas}><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="users.view">
      <Screen style={adminScreenStyles.canvas}>
        <View style={styles.profile}>
          <AvatarIcon name={user.name} size={64} />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.meta}>{user.email} · {user.phone ?? '—'}</Text>
          <StatusBadge status={user.isBlocked ? 'inactive' : 'active'} />
          <Button label="Edit profile" onPress={() => navigation.navigate('UserEdit', { userId })} />
        </View>

        <SectionCard title="Collection">
          <Text>Officer: {user.assignedOfficerName ?? 'Unassigned'}</Text>
          <Text style={styles.hint}>
            Field officers can only collect from customers assigned to them.
          </Text>
        </SectionCard>

        <SectionCard title="Active subscription">
          <Text>Plan: {user.planName ?? '—'}</Text>
          <Text>Speed: {user.planSpeed ? `${user.planSpeed} Mbps` : '—'}</Text>
          <Text>Expiry: {user.expiryDate ? new Date(user.expiryDate).toLocaleDateString() : '—'}</Text>
          <Text>Auto-renew: {user.autoRenew ? 'Yes' : 'No'}</Text>
        </SectionCard>

        <SectionCard title="Subscription history">
          {(subs ?? []).map((s) => (
            <Text key={s.id} style={styles.row}>
              {s.planName} · {s.status} · {new Date(s.endAt).toLocaleDateString()}
            </Text>
          ))}
        </SectionCard>

        <SectionCard title="Payment history">
          {(payments ?? []).map((p) => (
            <Text key={p.id} style={styles.row}>
              ₹{p.amount} · {p.paymentStatus} · {new Date(p.createdAt).toLocaleDateString()}
            </Text>
          ))}
        </SectionCard>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  profile: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  name: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  meta: { color: colors.textSecondary },
  row: { paddingVertical: spacing.xxs, color: colors.textSecondary, fontSize: 13 },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
});
