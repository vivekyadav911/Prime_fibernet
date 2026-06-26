import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SearchBar } from '@/components/admin';
import {
  DismissKeyboardFlatList,
  FullScreenModalShell,
} from '@/components/common';
import { useGetAdminOfficersQuery, useGetAdminUsersQuery } from '@/store/api/endpoints';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type SpecificUserPickerModalProps = {
  visible: boolean;
  selectedIds: string[];
  selectedNames: string[];
  onClose: () => void;
  onConfirm: (userIds: string[], userNames: string[]) => void;
};

type PickableUser = { id: string; name: string; subtitle: string; type: 'customer' | 'officer' };

export function SpecificUserPickerModal({
  visible,
  selectedIds,
  selectedNames,
  onClose,
  onConfirm,
}: SpecificUserPickerModalProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Map<string, string>>(() => {
    const map = new Map<string, string>();
    selectedIds.forEach((id, i) => map.set(id, selectedNames[i] ?? 'User'));
    return map;
  });

  useEffect(() => {
    if (!visible) return;
    const map = new Map<string, string>();
    selectedIds.forEach((id, i) => map.set(id, selectedNames[i] ?? 'User'));
    setSelected(map);
    setSearch('');
  }, [visible, selectedIds, selectedNames]);

  const { data: usersData } = useGetAdminUsersQuery({ page: 1, limit: 100, search: search || undefined });
  const { data: officers } = useGetAdminOfficersQuery({ search: search || undefined });

  const items = useMemo((): PickableUser[] => {
    const customers: PickableUser[] = (usersData?.items ?? []).map((u) => ({
      id: u.id,
      name: u.name,
      subtitle: u.email ?? u.phone ?? '',
      type: 'customer' as const,
    }));
    const officerItems: PickableUser[] = (officers ?? []).map((o) => ({
      id: o.id,
      name: o.name,
      subtitle: o.region ?? o.email ?? '',
      type: 'officer' as const,
    }));
    return [...customers, ...officerItems];
  }, [usersData, officers]);

  const toggle = (item: PickableUser) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, item.name);
      return next;
    });
  };

  const removeChip = (id: string) => {
    setSelected((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <FullScreenModalShell
      visible={visible}
      onRequestClose={onClose}
      title="Select Users"
      onCancel={onClose}
      onDone={() => onConfirm([...selected.keys()], [...selected.values()])}
      statusBarTranslucent={false}
    >
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name, phone, email..."
        containerStyle={styles.search}
      />

      <View style={styles.chips}>
        {[...selected.entries()].map(([id, name]) => (
          <Pressable key={id} style={styles.chip} onPress={() => removeChip(id)}>
            <Text style={styles.chipText}>{name}</Text>
            <Ionicons name="close" size={14} color={adminColors.primary} />
          </Pressable>
        ))}
      </View>
      <Text style={styles.count}>{selected.size} users selected</Text>

      <DismissKeyboardFlatList
        data={items}
        style={styles.list}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        renderItem={({ item }) => {
          const checked = selected.has(item.id);
          return (
            <Pressable style={styles.row} onPress={() => toggle(item)}>
              <Ionicons
                name={checked ? 'checkbox' : 'square-outline'}
                size={22}
                color={checked ? adminColors.primary : colors.textSecondary}
              />
              <View style={styles.rowBody}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowSub}>{item.subtitle}</Text>
              </View>
              <Text style={styles.typeBadge}>{item.type}</Text>
            </Pressable>
          );
        }}
      />
    </FullScreenModalShell>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  search: { margin: spacing.md },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: adminColors.primaryTint,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  chipText: { fontSize: 13, color: adminColors.primary },
  count: { fontSize: 13, color: colors.textSecondary, padding: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  rowBody: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  rowSub: { fontSize: 12, color: colors.textSecondary },
  typeBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
});
