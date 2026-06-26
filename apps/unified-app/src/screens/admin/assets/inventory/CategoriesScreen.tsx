import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Button, Screen } from '@prime/ui';

import { CategoryCard } from '@/components/Inventory';
import { AdminScreenLayout, FormField, RoleGuard, SearchBar } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  subscribeToCategories,
  updateCategory,
} from '@/services/inventoryService';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminInventoryStackParamList } from '@/types/navigation';
import type { InventoryCategory } from '@/types/inventory';
import { CATEGORY_COLOR_PRESETS, CATEGORY_ICON_PRESETS } from '@/utils/inventoryUtils';

type Props = NativeStackScreenProps<AdminInventoryStackParamList, 'Categories'>;

type CategoryForm = {
  name: string;
  description: string;
  iconName: string;
  iconColor: string;
  iconBgColor: string;
};

const EMPTY_FORM: CategoryForm = {
  name: '',
  description: '',
  iconName: 'cube-outline',
  iconColor: '#3B82F6',
  iconBgColor: '#EFF6FF',
};

export function CategoriesScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editing, setEditing] = useState<InventoryCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const unsub = subscribeToCategories(setCategories);
    return unsub;
  }, [load]);

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const openAdd = useCallback(() => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSheetVisible(true);
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={openAdd} hitSlop={8} style={styles.headerAddBtn}>
          <Ionicons name="add" size={26} color={colors.white} />
        </Pressable>
      ),
    });
  }, [navigation, openAdd]);

  const openEdit = (cat: InventoryCategory) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      description: cat.description,
      iconName: cat.iconName,
      iconColor: cat.iconColor,
      iconBgColor: cat.iconBgColor,
    });
    setSheetVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, form);
        dispatch(enqueueToast({ message: 'Category updated', type: 'success', id: `toast-${Date.now()}` }));
      } else {
        await createCategory(form);
        dispatch(enqueueToast({ message: 'Category created', type: 'success', id: `toast-${Date.now()}` }));
      }
      setSheetVisible(false);
      await load();
    } catch (e) {
      dispatch(enqueueToast({
        message: e instanceof Error ? e.message : 'Save failed',
        type: 'error', id: `toast-${Date.now()}`,
      }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (cat: InventoryCategory) => {
    Alert.alert(
      `Delete ${cat.name}?`,
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteCategory(cat.id);
                dispatch(enqueueToast({ message: 'Category deleted', type: 'success', id: `toast-${Date.now()}` }));
                await load();
              } catch (e) {
                dispatch(enqueueToast({
                  message: e instanceof Error ? e.message : 'Delete failed',
                  type: 'error', id: `toast-${Date.now()}`,
                }));
              }
            })();
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <RoleGuard requiredPermission="inventory.edit">
        <Screen><SkeletonLoader rows={6} /></Screen>
      </RoleGuard>
    );
  }

  if (error) {
    return (
      <RoleGuard requiredPermission="inventory.edit">
        <Screen><ErrorState message={error} onRetry={load} /></Screen>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard requiredPermission="inventory.edit">
      <AdminScreenLayout>
        <View style={styles.searchWrap}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search categories..." />
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>MAIN CATEGORIES ({filtered.length})</Text>
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="pricetag-outline" size={64} color={colors.borderDefault} />
            <Text style={styles.emptyTitle}>No categories yet</Text>
            <Button label="Add Category" onPress={openAdd} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <CategoryCard
                category={item}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            )}
          />
        )}

        <Modal visible={sheetVisible} transparent animationType="slide">
          <Pressable style={styles.modalBackdrop} onPress={() => setSheetVisible(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.sheetTitle}>
                {editing ? 'Edit Category' : 'Add Category'}
              </Text>
              <FormField label="Name *" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
              <FormField label="Description" value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} multiline />
              <Text style={styles.fieldLabel}>Icon</Text>
              <View style={styles.iconRow}>
                {CATEGORY_ICON_PRESETS.map((icon) => (
                  <Pressable
                    key={icon}
                    style={[styles.iconOption, form.iconName === icon && styles.iconOptionActive]}
                    onPress={() => setForm((f) => ({ ...f, iconName: icon }))}
                  >
                    <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={form.iconColor} />
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Color</Text>
              <View style={styles.colorRow}>
                {CATEGORY_COLOR_PRESETS.map((preset) => (
                  <Pressable
                    key={preset.color}
                    style={[styles.colorDot, { backgroundColor: preset.color }]}
                    onPress={() => setForm((f) => ({
                      ...f,
                      iconColor: preset.color,
                      iconBgColor: preset.bg,
                    }))}
                  />
                ))}
              </View>
              <Button label={saving ? 'Saving...' : 'Save Category'} onPress={() => void handleSave()} disabled={saving} />
            </Pressable>
          </Pressable>
        </Modal>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  headerAddBtn: { marginRight: spacing.sm },
  searchWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  sectionRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1 },
  empty: { alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    maxHeight: '80%',
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', marginTop: spacing.sm },
  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginVertical: spacing.sm },
  iconOption: { padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderDefault },
  iconOptionActive: { borderColor: adminColors.primary, borderWidth: 2 },
  colorRow: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
});
