import { useMemo, useState } from 'react';
import { Image, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useGetOfficersQuery } from '@/services/api/officersApi';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export type OfficerPickerOption = {
  id: string;
  name: string;
  avatarUrl: string | null;
  subtitle: string | null;
};

type Props = {
  label?: string;
  value: string;
  onSelect: (officerId: string) => void;
  error?: string;
};

export function OfficerSearchField({
  label = 'Officer',
  value,
  onSelect,
  error,
}: Props) {
  const { data: officers } = useGetOfficersQuery();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const options: OfficerPickerOption[] = useMemo(
    () =>
      (officers ?? []).map((o) => ({
        id: o.id,
        name: o.name?.trim() || 'Unknown officer',
        avatarUrl: (o as { profilePhotoUrl?: string | null }).profilePhotoUrl ?? null,
        subtitle: o.region,
      })),
    [officers],
  );

  const selected = options.find((o) => o.id === value);
  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={[styles.trigger, error ? styles.triggerError : null]} onPress={() => setOpen(true)}>
        {selected?.avatarUrl ? (
          <Image source={{ uri: selected.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>
              {(selected?.name ?? '?').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.triggerText}>{selected?.name ?? 'Select officer…'}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select officer</Text>
            <Pressable onPress={() => setOpen(false)}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name"
            placeholderTextColor={colors.textSecondary}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={[styles.option, value === item.id && styles.optionActive]}
                onPress={() => {
                  onSelect(item.id);
                  setOpen(false);
                  setQuery('');
                }}
              >
                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>{item.name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.optionText}>
                  <Text style={styles.optionName}>{item.name}</Text>
                  {item.subtitle ? (
                    <Text style={styles.optionSub}>{item.subtitle}</Text>
                  ) : null}
                </View>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
    textTransform: 'uppercase',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceWhite,
  },
  triggerError: { borderColor: colors.errorRed },
  triggerText: { fontSize: 15, color: colors.textPrimary, flex: 1 },
  error: { color: colors.errorRed, fontSize: 12, marginTop: spacing.xxs },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: {
    backgroundColor: adminColors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: adminColors.primary, fontWeight: '700', fontSize: 13 },
  modal: { flex: 1, backgroundColor: colors.surfaceWhite, paddingTop: spacing.lg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: adminColors.primary },
  close: { color: adminColors.primary, fontWeight: '600' },
  search: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  optionActive: { backgroundColor: adminColors.primaryTint },
  optionText: { flex: 1 },
  optionName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  optionSub: { fontSize: 12, color: colors.textSecondary },
});
