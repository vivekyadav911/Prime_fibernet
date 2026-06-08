import { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Screen, colors } from '@prime/ui';
import type { Plan } from '@prime/types';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import {
  useCreatePlanMutation,
  useDeletePlanMutation,
  useGetPlansQuery,
  useUpdatePlanMutation,
} from '@/store/api/endpoints';
import { queryErrorMessage } from '@/utils/queryError';

export function AdminPlansScreen() {
  const { data, isLoading, isError, error, refetch } = useGetPlansQuery();
  const [createPlan] = useCreatePlanMutation();
  const [updatePlan] = useUpdatePlanMutation();
  const [deletePlan] = useDeletePlanMutation();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState({ name: '', speedMbps: '50', price: '499', validityDays: '30' });

  const onSave = async () => {
    const payload = {
      name: form.name,
      speedMbps: Number(form.speedMbps),
      price: Number(form.price),
      validityDays: Number(form.validityDays),
      features: [] as string[],
      isActive: true,
    };
    if (editing) {
      await updatePlan({ id: editing.id, ...payload });
    } else {
      await createPlan(payload);
    }
    setEditing(null);
    setForm({ name: '', speedMbps: '50', price: '499', validityDays: '30' });
    refetch();
  };

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={6} showAvatar />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.form}>
        <Text style={styles.formTitle}>{editing ? 'Edit plan' : 'Create plan'}</Text>
        <TextInput style={styles.input} placeholder="Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
        <TextInput style={styles.input} placeholder="Speed Mbps" value={form.speedMbps} onChangeText={(v) => setForm({ ...form, speedMbps: v })} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="Price" value={form.price} onChangeText={(v) => setForm({ ...form, price: v })} keyboardType="numeric" />
        <TextInput style={styles.input} placeholder="Validity days" value={form.validityDays} onChangeText={(v) => setForm({ ...form, validityDays: v })} keyboardType="numeric" />
        <Button label={editing ? 'Update' : 'Create'} onPress={onSave} />
      </View>
      {!data?.length ? (
        <EmptyState title="No plans yet" subtitle="Create your first internet plan" icon="📶" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.speedMbps} Mbps · ₹{item.price}</Text>
              </View>
              <Button label="Edit" variant="ghost" onPress={() => { setEditing(item); setForm({ name: item.name, speedMbps: String(item.speedMbps), price: String(item.price), validityDays: String(item.validityDays) }); }} />
              <Button label="Delete" variant="ghost" onPress={() => { deletePlan(item.id); refetch(); }} />
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { padding: 16, borderBottomWidth: 1, borderColor: colors.borderDefault, gap: 8 },
  formTitle: { fontWeight: '600' },
  input: { borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 8, padding: 10 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: colors.borderDefault, gap: 8 },
  name: { fontWeight: '600' },
  meta: { color: colors.textSecondary, fontSize: 12 },
});
