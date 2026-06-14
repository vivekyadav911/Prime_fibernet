import { useCallback, useEffect, useState } from 'react';

import {
  createInventoryItem,
  fetchCategories,
  fetchInventoryItemById,
  updateInventoryItem,
} from '@/services/inventoryService';
import { useAppSelector } from '@/store/hooks';
import type { AddItemFormData, InventoryItem } from '@/types/inventory';
import { DEFAULT_ADD_ITEM_FORM } from '@/types/inventory';
import {
  inventoryItemToFormData,
  validateAddItemForm,
} from '@/utils/inventoryUtils';

type UseInventoryFormOptions = {
  mode: 'add' | 'edit';
  itemId?: string;
};

export function useInventoryForm({ mode, itemId }: UseInventoryFormOptions) {
  const user = useAppSelector((s) => s.auth.user);
  const [formData, setFormData] = useState<AddItemFormData>(DEFAULT_ADD_ITEM_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof AddItemFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(mode === 'edit');

  useEffect(() => {
    if (mode !== 'edit' || !itemId) {
      void fetchCategories().then((cats) => {
        if (cats.length > 0) {
          setFormData((prev) => ({ ...prev, categoryId: prev.categoryId || cats[0]!.id }));
        }
      });
      return;
    }

    setIsLoading(true);
    void (async () => {
      try {
        const item = await fetchInventoryItemById(itemId);
        setFormData(inventoryItemToFormData(item));
      } catch (e) {
        console.warn('[useInventoryForm] load failed:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [mode, itemId]);

  const updateField = useCallback((field: keyof AddItemFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const nextErrors = validateAddItemForm(formData);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [formData]);

  const submit = useCallback(async (): Promise<boolean> => {
    if (!validate()) return false;
    if (!user) return false;

    setIsSubmitting(true);
    try {
      if (mode === 'add') {
        await createInventoryItem(formData, user.id, user.name);
      } else if (itemId) {
        const { totalQuantity: _tq, ...rest } = formData;
        await updateInventoryItem(itemId, rest, user.id, user.name);
      }
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save item';
      if (msg.includes('SKU')) setErrors((prev) => ({ ...prev, sku: msg }));
      else setErrors((prev) => ({ ...prev, name: msg }));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, user, mode, formData, itemId]);

  const reset = useCallback(() => {
    setFormData(DEFAULT_ADD_ITEM_FORM);
    setErrors({});
  }, []);

  return {
    formData,
    errors,
    isSubmitting,
    isLoading,
    updateField,
    validate,
    submit,
    reset,
  };
}

export function useInventoryFormWithItem(mode: 'edit', initialData: InventoryItem) {
  const user = useAppSelector((s) => s.auth.user);
  const [formData, setFormData] = useState<AddItemFormData>(() => inventoryItemToFormData(initialData));
  const [errors, setErrors] = useState<Partial<Record<keyof AddItemFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = useCallback((field: keyof AddItemFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const nextErrors = validateAddItemForm(formData);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [formData]);

  const submit = useCallback(async (): Promise<boolean> => {
    if (!validate() || !user) return false;
    setIsSubmitting(true);
    try {
      const { totalQuantity: _tq, ...rest } = formData;
      await updateInventoryItem(initialData.id, rest, user.id, user.name);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update item';
      setErrors((prev) => ({ ...prev, name: msg }));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, user, formData, initialData.id]);

  return { formData, errors, isSubmitting, isLoading: false, updateField, validate, submit, reset: () => {} };
}
