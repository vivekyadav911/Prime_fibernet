import { useLayoutEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { ActionTabSelector } from '@/components/Inventory';
import { AdminScreenLayout, FormField, RoleGuard } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useInventoryItem } from '@/hooks/useInventoryItem';
import { useQuickAction } from '@/hooks/useQuickAction';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { adminColors } from '@/theme/admin';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminInventoryStackParamList } from '@/types/navigation';
import { truncate } from '@/utils/inventoryUtils';

type Props = NativeStackScreenProps<AdminInventoryStackParamList, 'QuickAction'>;

export function QuickActionScreen({ navigation, route }: Props) {
  const { itemId, defaultAction } = route.params;
  const dispatch = useAppDispatch();
  const { item, isLoading, error } = useInventoryItem(itemId);
  const {
    formData,
    errors,
    isSubmitting,
    updateField,
    selectAction,
    submit,
  } = useQuickAction(defaultAction);

  useLayoutEffect(() => {
    if (item) {
      navigation.setOptions({
        title: `Quick Action: ${truncate(item.name, 20)}`,
      });
    }
  }, [navigation, item]);

  const handleConfirm = async () => {
    if (!item) return;
    const ok = await submit(item);
    if (ok) {
      dispatch(enqueueToast({ message: 'Stock updated successfully', type: 'success', id: `toast-${Date.now()}` }));
      navigation.goBack();
    } else if (errors.quantity) {
      dispatch(enqueueToast({ message: `Action failed: ${errors.quantity}`, type: 'error', id: `toast-${Date.now()}` }));
    }
  };

  if (isLoading) {
    return (
      <RoleGuard requiredPermission="inventory.edit">
        <Screen><SkeletonLoader rows={5} /></Screen>
      </RoleGuard>
    );
  }

  if (error || !item) {
    return (
      <RoleGuard requiredPermission="inventory.edit">
        <Screen><ErrorState message={error ?? 'Item not found'} onRetry={() => navigation.goBack()} /></Screen>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard requiredPermission="inventory.edit">
      <AdminScreenLayout>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.summaryCard}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.sku}>SKU: {item.sku || '—'}</Text>
            <View style={styles.statRow}>
              <View style={[styles.statBox, { backgroundColor: '#F0FDF4' }]}>
                <Text style={styles.statLabel}>Available</Text>
                <Text style={[styles.statValue, { color: '#10B981' }]}>{item.availableQuantity}</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: '#FFFBEB' }]}>
                <Text style={styles.statLabel}>Assigned</Text>
                <Text style={[styles.statValue, { color: '#F59E0B' }]}>{item.assignedQuantity}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Select Action</Text>
          <ActionTabSelector
            selected={formData.actionType}
            availableQty={item.availableQuantity}
            assignedQty={item.assignedQuantity}
            onSelect={selectAction}
            showAddStock={defaultAction === 'add_stock'}
          />

          <Text style={styles.sectionLabel}>Quantity</Text>
          <FormField
            label=""
            value={formData.quantity}
            onChangeText={(v) => updateField('quantity', v)}
            keyboardType="numeric"
            placeholder="Enter quantity"
            error={errors.quantity}
          />

          <Text style={styles.sectionLabel}>Notes (Optional)</Text>
          <FormField
            label=""
            value={formData.notes}
            onChangeText={(v) => updateField('notes', v)}
            multiline
            placeholder="Add any additional notes..."
          />
        </ScrollView>

        <Pressable
          style={[styles.confirmBtn, isSubmitting && styles.confirmBtnDisabled]}
          onPress={() => void handleConfirm()}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.confirmText}>✓ Confirm Action</Text>
          )}
        </Pressable>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md },
  summaryCard: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  itemName: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  sku: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  statRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  statBox: { flex: 1, borderRadius: radius.sm, padding: spacing.md },
  statLabel: { fontSize: 12, color: colors.textSecondary },
  statValue: { fontSize: 22, fontWeight: '700', marginTop: 4 },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm, marginTop: spacing.md },
  confirmBtn: {
    backgroundColor: '#1E1B4B',
    margin: spacing.md,
    borderRadius: radius.sm,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: { opacity: 0.7 },
  confirmText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
