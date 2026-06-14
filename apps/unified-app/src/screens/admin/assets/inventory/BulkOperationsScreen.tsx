import { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@prime/ui';

import { BulkItemCard } from '@/components/Inventory';
import { FormField, RoleGuard, SelectField } from '@/components/admin';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useInventory } from '@/hooks/useInventory';
import { bulkAction } from '@/services/inventoryService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { AdminInventoryStackParamList } from '@/types/navigation';
import type { BulkActionPayload } from '@/types/inventory';

type Props = NativeStackScreenProps<AdminInventoryStackParamList, 'BulkOperations'>;

export function BulkOperationsScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { items, isLoading, error, refresh } = useInventory();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sheetVisible, setSheetVisible] = useState(false);
  const [actionType, setActionType] = useState<BulkActionPayload['actionType']>('add_stock');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ succeeded: string[]; failed: { itemId: string; error: string }[] } | null>(null);

  const selectedCount = selected.size;
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  }, [allSelected, items]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: selectedCount > 0 ? `Bulk Operations (${selectedCount})` : 'Bulk Operations',
    });
  }, [navigation, selectedCount]);

  const handleConfirm = async () => {
    if (!user || selectedCount === 0) return;
    const qty = parseInt(quantity, 10);
    if (!Number.isInteger(qty) || qty < 1) {
      dispatch(enqueueToast({ message: 'Enter a valid quantity', type: 'error', id: `toast-${Date.now()}` }));
      return;
    }

    setProcessing(true);
    try {
      const res = await bulkAction(
        {
          itemIds: Array.from(selected),
          actionType,
          quantity: qty,
          notes,
        },
        user.id,
        user.name,
      );
      setResult(res);
      setSheetVisible(false);
      setSelected(new Set());
      refresh();
      dispatch(enqueueToast({
        id: `toast-${Date.now()}`,
        type: res.failed.length === 0 ? 'success' : 'warning',
        message: `${res.succeeded.length} succeeded, ${res.failed.length} failed`,
      }));
    } catch (e) {
      dispatch(enqueueToast({
        id: `toast-${Date.now()}`,
        type: 'error',
        message: e instanceof Error ? e.message : 'Bulk action failed',
      }));
    } finally {
      setProcessing(false);
    }
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
        <Screen><ErrorState message={error} onRetry={refresh} /></Screen>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard requiredPermission="inventory.edit">
      <Screen padded={false} style={styles.screen}>
        <Pressable style={styles.selectAll} onPress={toggleAll}>
          <Ionicons
            name={allSelected ? 'checkbox' : 'square-outline'}
            size={22}
            color={adminColors.primary}
          />
          <Text style={styles.selectAllText}>Select All</Text>
        </Pressable>

        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <BulkItemCard
              item={item}
              isSelected={selected.has(item.id)}
              onToggle={toggle}
            />
          )}
        />

        {selectedCount > 0 ? (
          <View style={styles.actionBar}>
            <Text style={styles.actionBarText}>{selectedCount} items selected</Text>
            <Pressable style={styles.applyBtn} onPress={() => setSheetVisible(true)}>
              <Text style={styles.applyBtnText}>Apply Action ▼</Text>
            </Pressable>
          </View>
        ) : null}

        <Modal visible={sheetVisible} transparent animationType="slide">
          <Pressable style={styles.modalBackdrop} onPress={() => !processing && setSheetVisible(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.sheetTitle}>Bulk Action</Text>
              <SelectField
                label="Action Type"
                value={actionType}
                options={[
                  { value: 'add_stock', label: 'Add Stock' },
                  { value: 'sold', label: 'Sold' },
                  { value: 'damaged', label: 'Damaged' },
                  { value: 'returned', label: 'Returned' },
                ]}
                onSelect={(v) => setActionType(v as BulkActionPayload['actionType'])}
              />
              <FormField label="Quantity (per item)" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
              <FormField label="Notes" value={notes} onChangeText={setNotes} multiline />
              <Pressable
                style={[styles.confirmBtn, processing && styles.confirmDisabled]}
                onPress={() => void handleConfirm()}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.confirmText}>Confirm Bulk Action</Text>
                )}
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={result !== null} transparent animationType="fade">
          <View style={styles.resultModal}>
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>Bulk Action Results</Text>
              <Text style={styles.resultLine}>Succeeded: {result?.succeeded.length ?? 0}</Text>
              <Text style={styles.resultLine}>Failed: {result?.failed.length ?? 0}</Text>
              {result?.failed.map((f) => (
                <Text key={f.itemId} style={styles.resultError}>{f.error}</Text>
              ))}
              <Pressable style={styles.resultClose} onPress={() => setResult(null)}>
                <Text style={styles.resultCloseText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: adminColors.canvasBg, flex: 1 },
  selectAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  selectAllText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surfaceWhite,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
  },
  actionBarText: { fontSize: 14, fontWeight: '600' },
  applyBtn: {
    backgroundColor: '#1E1B4B',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  applyBtnText: { color: colors.white, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  confirmBtn: {
    backgroundColor: '#1E1B4B',
    borderRadius: radius.sm,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  confirmDisabled: { opacity: 0.7 },
  confirmText: { color: colors.white, fontWeight: '700' },
  resultModal: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.md },
  resultCard: { backgroundColor: colors.surfaceWhite, borderRadius: radius.md, padding: spacing.md },
  resultTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  resultLine: { fontSize: 14, marginBottom: spacing.xs },
  resultError: { fontSize: 12, color: colors.errorRed },
  resultClose: { marginTop: spacing.md, alignItems: 'center' },
  resultCloseText: { color: adminColors.primary, fontWeight: '600' },
});
