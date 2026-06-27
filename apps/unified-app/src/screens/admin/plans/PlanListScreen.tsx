import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Plan } from '@prime/types';
import { AdminButton, AdminEmptyState, AdminScreenLayout, AdminStateShell, RoleGuard, StatusBadge } from '@/components/admin';
import { useDeletePlanMutation, useGetPlansQuery, useUpdatePlanMutation } from '@/store/api/endpoints';
import type { AdminPlansStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type Props = NativeStackScreenProps<AdminPlansStackParamList, 'PlanList'>;

export function PlanListScreen({ navigation }: Props) {
  const { data, isLoading, isError, error, refetch } = useGetPlansQuery();
  const [updatePlan] = useUpdatePlanMutation();
  const [deletePlan] = useDeletePlanMutation();

  const toggleActive = useCallback(
    (plan: Plan) => {
      updatePlan({ id: plan.id, isActive: !plan.isActive });
      refetch();
    },
    [refetch, updatePlan],
  );

  const renderItem = useCallback(
    ({ item }: { item: Plan }) => (
      <View style={styles.card}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>{item.speedMbps} Mbps · ₹{item.price} · {item.validityDays}d</Text>
        <StatusBadge status={item.isActive ? 'active' : 'blocked'} />
        <View style={styles.actions}>
          <AdminButton label="Edit" variant="ghost" onPress={() => navigation.navigate('PlanForm', { mode: 'edit', planId: item.id })} />
          <AdminButton label={item.isActive ? 'Deactivate' : 'Activate'} variant="secondary" onPress={() => toggleActive(item)} />
          <AdminButton label="Delete" variant="ghost" onPress={() => deletePlan(item.id)} />
        </View>
      </View>
    ),
    [deletePlan, navigation, toggleActive],
  );

  return (
    <RoleGuard requiredPermission="plans.view">
      <AdminStateShell
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        loadingRows={6}
      >
      <AdminScreenLayout padded={false}>
        <View style={styles.header}>
          <AdminButton label="Add New Plan" onPress={() => navigation.navigate('PlanForm', { mode: 'create' })} />
        </View>
        {!data?.length ? <AdminEmptyState title="No plans" iconName="cellular-outline" /> : (
          <FlatList data={data} keyExtractor={(p) => p.id} renderItem={renderItem} />
        )}
      </AdminScreenLayout>
      </AdminStateShell>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.sm },
  card: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.borderDefault, gap: spacing.xxs },
  name: { fontWeight: '700', fontSize: 16 },
  meta: { color: colors.textSecondary, fontSize: 13 },
  actions: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
});
