import { useCallback, useState } from 'react';

import { performQuickAction } from '@/services/inventoryService';
import { useAppSelector } from '@/store/hooks';
import type { InventoryItem, QuickActionFormData } from '@/types/inventory';
import { DEFAULT_QUICK_ACTION_FORM } from '@/types/inventory';

export function useQuickAction(defaultAction?: QuickActionFormData['actionType']) {
  const user = useAppSelector((s) => s.auth.user);
  const [formData, setFormData] = useState<QuickActionFormData>({
    ...DEFAULT_QUICK_ACTION_FORM,
    actionType: defaultAction ?? 'sold',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof QuickActionFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = useCallback((field: keyof QuickActionFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const selectAction = useCallback((action: QuickActionFormData['actionType']) => {
    setFormData((prev) => ({ ...prev, actionType: action, quantity: '' }));
    setErrors({});
  }, []);

  const validate = useCallback((item: InventoryItem): boolean => {
    const nextErrors: Partial<Record<keyof QuickActionFormData, string>> = {};
    const qty = parseInt(formData.quantity, 10);

    if (!formData.quantity.trim()) {
      nextErrors.quantity = 'Quantity is required';
    } else if (!Number.isInteger(qty) || qty < 1) {
      nextErrors.quantity = 'Must be at least 1';
    } else if (formData.actionType === 'sold' || formData.actionType === 'damaged') {
      if (qty > item.availableQuantity) {
        nextErrors.quantity = `Cannot exceed available stock of ${item.availableQuantity}`;
      }
    } else if (formData.actionType === 'returned') {
      if (qty > item.assignedQuantity) {
        nextErrors.quantity = `Cannot exceed assigned stock of ${item.assignedQuantity}`;
      }
    } else if (formData.actionType === 'add_stock') {
      if (qty < 1) nextErrors.quantity = 'Must be at least 1';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [formData]);

  const submit = useCallback(async (item: InventoryItem): Promise<boolean> => {
    if (!validate(item) || !user) return false;

    setIsSubmitting(true);
    try {
      await performQuickAction(item.id, formData, user.id, user.name);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Action failed';
      setErrors((prev) => ({ ...prev, quantity: msg }));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, user, formData]);

  return {
    formData,
    errors,
    isSubmitting,
    updateField,
    selectAction,
    validate,
    submit,
  };
}
