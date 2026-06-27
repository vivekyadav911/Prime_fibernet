import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AdminScreenLayout, AdminStateShell, FormField, RoleGuard, SelectField } from '@/components/admin';
import { useInventoryForm } from '@/hooks/useInventoryForm';
import { fetchCategories } from '@/services/inventoryService';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminInventoryStackParamList } from '@/types/navigation';
import type { InventoryCategory } from '@/types/inventory';

type Props = NativeStackScreenProps<AdminInventoryStackParamList, 'EditItem'>;

export function EditItemScreen({ navigation, route }: Props) {
  const { itemId } = route.params;
  const dispatch = useAppDispatch();
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const { formData, errors, isSubmitting, isLoading, updateField, submit } = useInventoryForm({
    mode: 'edit',
    itemId,
  });

  useEffect(() => {
    void fetchCategories().then(setCategories);
  }, []);

  const handleSubmit = async () => {
    const ok = await submit();
    if (ok) {
      dispatch(enqueueToast({ message: 'Item updated successfully', type: 'success', id: `toast-${Date.now()}` }));
      navigation.navigate('ItemDetail', { itemId });
    }
  };

  if (isLoading) {
    return (
      <RoleGuard requiredPermission="inventory.edit">
        <AdminStateShell isLoading loadingRows={6}>{null}</AdminStateShell>
      </RoleGuard>
    );
  }

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <RoleGuard requiredPermission="inventory.edit">
      <AdminScreenLayout>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <FormField label="Item Name *" value={formData.name} onChangeText={(v) => updateField('name', v)} error={errors.name} />
            <FormField label="SKU *" value={formData.sku} onChangeText={(v) => updateField('sku', v)} autoCapitalize="characters" error={errors.sku} />
            <FormField label="Description" value={formData.description} onChangeText={(v) => updateField('description', v)} multiline />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category & Status</Text>
            <SelectField label="Category *" value={formData.categoryId} options={categoryOptions} onSelect={(v) => updateField('categoryId', v)} error={errors.categoryId} />
            <SelectField
              label="Status *"
              value={formData.status}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              onSelect={(v) => updateField('status', v)}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Brand & Model</Text>
            <FormField label="Brand" value={formData.brand} onChangeText={(v) => updateField('brand', v)} />
            <FormField label="Model" value={formData.model} onChangeText={(v) => updateField('model', v)} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stock & Pricing</Text>
            <View style={styles.lockedField}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
              <Text style={styles.lockedLabel}>Total Quantity (read-only)</Text>
              <Text style={styles.lockedValue}>{formData.totalQuantity}</Text>
            </View>
            <FormField label="Unit Cost (₹)" value={formData.unitCost} onChangeText={(v) => updateField('unitCost', v)} keyboardType="decimal-pad" error={errors.unitCost} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            <FormField label="Location" value={formData.location} onChangeText={(v) => updateField('location', v)} />
            <FormField label="Notes" value={formData.notes} onChangeText={(v) => updateField('notes', v)} multiline />
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.saveBtn} onPress={() => void handleSubmit()} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.saveText}>Update Item</Text>
            )}
          </Pressable>
        </View>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: 100 },
  section: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  lockedField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    marginBottom: spacing.sm,
  },
  lockedLabel: { flex: 1, fontSize: 12, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
  lockedValue: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  bottomBar: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.surfaceWhite,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    gap: spacing.sm,
  },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 48 },
  cancelText: { fontSize: 16, color: colors.textSecondary },
  saveBtn: {
    flex: 1,
    backgroundColor: adminColors.ctaDark,
    borderRadius: radius.sm,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
