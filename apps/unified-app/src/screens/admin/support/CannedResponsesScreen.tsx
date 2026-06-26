import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen, Button } from '@prime/ui';

import { RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetCannedResponsesQuery, useUpsertCannedResponseMutation } from '@/services/api/adminSupportApi';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AdminSupportStackParamList } from '@/types/navigation';
import type { CannedResponse } from '@/types/support';
import { queryErrorMessage } from '@/utils/queryError';

type Props = NativeStackScreenProps<AdminSupportStackParamList, 'CannedResponses'>;

export function CannedResponsesScreen(_props: Props) {
  const { data, isLoading, isError, error, refetch } = useGetCannedResponsesQuery();
  const [upsert] = useUpsertCannedResponseMutation();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [body, setBody] = useState('');

  const grouped = useMemo(() => {
    const map = new Map<string, CannedResponse[]>();
    for (const item of data ?? []) {
      const key = item.category ?? 'general';
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [data]);

  const handleSave = useCallback(async () => {
    if (!title.trim() || !body.trim()) return;
    await upsert({ title: title.trim(), shortcut: shortcut.trim() || null, body: body.trim() });
    setShowForm(false);
    setTitle('');
    setShortcut('');
    setBody('');
  }, [title, shortcut, body, upsert]);

  if (isLoading) return <Screen><SkeletonLoader rows={5} /></Screen>;
  if (isError) return <Screen><ErrorState message={queryErrorMessage(error)} onRetry={refetch} /></Screen>;

  return (
    <RoleGuard requiredPermission="settings.view">
      <Screen style={styles.screen}>
        <FlatList
          data={grouped}
          keyExtractor={([cat]) => cat}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Pressable style={styles.addBtn} onPress={() => setShowForm(true)}>
              <Text style={styles.addText}>+ Add Response</Text>
            </Pressable>
          }
          renderItem={({ item: [category, items] }) => (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>{category}</Text>
              {items.map((c) => (
                <View key={c.id} style={styles.row}>
                  <Text style={styles.shortcut}>{c.shortcut ?? '—'}</Text>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowTitle}>{c.title}</Text>
                    <Text style={styles.preview} numberOfLines={2}>{c.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        />

        {showForm ? (
          <View style={styles.form}>
            <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
            <TextInput style={styles.input} placeholder="#shortcut" value={shortcut} onChangeText={setShortcut} />
            <TextInput style={[styles.input, styles.body]} placeholder="Body" value={body} onChangeText={setBody} multiline />
            <View style={styles.formActions}>
              <Button label="Cancel" variant="ghost" onPress={() => setShowForm(false)} />
              <Button label="Save" onPress={() => void handleSave()} />
            </View>
          </View>
        ) : null}
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: adminColors.canvasBg },
  list: { padding: spacing.md },
  addBtn: { marginBottom: spacing.md },
  addText: { fontSize: 14, fontWeight: '600', color: adminColors.primary },
  group: { marginBottom: spacing.lg },
  groupTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surfaceWhite, padding: spacing.md, borderRadius: 10, marginBottom: spacing.sm },
  shortcut: { fontFamily: 'monospace', fontSize: 12, fontWeight: '700', color: adminColors.primary, minWidth: 56 },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  preview: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  form: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceWhite,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
  },
  input: { borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 8, padding: spacing.sm, marginBottom: spacing.sm, fontSize: 14 },
  body: { minHeight: 80 },
  formActions: { flexDirection: 'row', justifyContent: 'space-between' },
});
