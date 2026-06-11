import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Plan } from '@prime/types';
import { Button, Screen } from '@prime/ui';

import { AdminEmptyState, RoleGuard, StatusBadge } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useDeletePlanMutation, useGetPlansQuery, useUpdatePlanMutation } from '@/store/api/endpoints';
import type { AdminPlansStackParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { queryErrorMessage } from '@/utils/queryError';

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
          <Button label="Edit" variant="ghost" onPress={() => navigation.navigate('PlanForm', { planId: item.id })} />
          <Button label={item.isActive ? 'Deactivate' : 'Activate'} variant="secondary" onPress={() => toggleActive(item)} />
          <Button label="Delete" variant="ghost" onPress={() => deletePlan(item.id)} />
        </View>
      </View>
    ),
    [deletePlan, navigation, toggleActive],
  );

  if (isLoading) return <Screen><SkeletonLoader rows={6} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="plans.view">
      <Screen padded={false}>
        <View style={styles.header}>
          <Button label="Add New Plan" onPress={() => navigation.navigate('PlanForm', {})} />
        </View>
        {!data?.length ? <AdminEmptyState title="No plans" icon="📶" /> : (
          <FlatList data={data} keyExtractor={(p) => p.id} renderItem={renderItem} />
        )}
      </Screen>
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
