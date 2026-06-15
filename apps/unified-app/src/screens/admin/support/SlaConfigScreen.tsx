import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, Button } from '@prime/ui';

import { RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetSlaPoliciesQuery, useUpdateSlaPolicyMutation } from '@/services/api/adminSupportApi';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminSupportStackParamList } from '@/types/navigation';
import type { SlaPolicy } from '@/types/support';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminSupportStackParamList, 'SlaConfig'>;

export function SlaConfigScreen({}: Props) {
  const { data, isLoading, isError, error, refetch } = useGetSlaPoliciesQuery();
  const [updatePolicy, { isLoading: saving }] = useUpdateSlaPolicyMutation();
  const [edits, setEdits] = useState<Record<string, Partial<SlaPolicy>>>({});

  const handleSave = useCallback(
    async (policy: SlaPolicy) => {
      const patch = edits[policy.id] ?? {};
      try {
        await updatePolicy({ ...policy, ...patch, id: policy.id }).unwrap();
        setEdits((prev) => {
          const next = { ...prev };
          delete next[policy.id];
          return next;
        });
        Alert.alert('Saved', 'SLA policy updated.');
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Save failed');
      }
    },
    [edits, updatePolicy],
  );

  const renderItem = useCallback(
    ({ item }: { item: SlaPolicy }) => {
      const edit = edits[item.id] ?? {};
      const merged = { ...item, ...edit };
      return (
        <View style={styles.card}>
          <Text style={styles.priority}>{item.priority}</Text>
          <Text style={styles.label}>First Response (hrs)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={String(merged.firstResponseHours)}
            onChangeText={(v) =>
              setEdits((prev) => ({
                ...prev,
                [item.id]: { ...prev[item.id], firstResponseHours: Number(v) || 0 },
              }))
            }
          />
          <Text style={styles.label}>Resolution (hrs)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={String(merged.resolutionHours)}
            onChangeText={(v) =>
              setEdits((prev) => ({
                ...prev,
                [item.id]: { ...prev[item.id], resolutionHours: Number(v) || 0 },
              }))
            }
          />
          <Button label="Save" onPress={() => void handleSave(item)} />
        </View>
      );
    },
    [edits, handleSave],
  );

  if (isLoading) return <Screen><SkeletonLoader rows={4} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="settings.view">
      <Screen style={styles.screen}>
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<Text style={styles.title}>SLA Policies</Text>}
        />
        {saving ? <Text style={styles.saving}>Saving…</Text> : null}
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: adminColors.canvasBg },
  list: { padding: spacing.md },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  priority: { fontSize: 16, fontWeight: '700', color: adminColors.primary, marginBottom: spacing.sm },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceWhite,
    marginTop: spacing.xs,
  },
  saving: { textAlign: 'center', color: colors.textSecondary, padding: spacing.sm },
});
