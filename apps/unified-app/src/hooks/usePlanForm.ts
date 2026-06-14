import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';

import { createPlan, duplicatePlan, fetchPlans, updatePlan } from '@/services/planService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import type { Plan, PlanFormData } from '@/types/plans';
import { computePerDayCost, formatValidity } from '@/utils/planUtils';

const planFormSchema = z.object({
  displayName: z.string().trim().min(3, 'Display name must be at least 3 characters'),
  name: z.string(),
  description: z.string(),
  planTag: z.string(),
  category: z.enum(['standard', 'premium', 'business', 'student', 'custom']),
  speedMbps: z
    .union([z.number(), z.literal('')])
    .refine((v) => v !== '' && Number(v) > 0, 'Speed must be a positive number')
    .refine((v) => v === '' || Number(v) <= 10000, 'Speed cannot exceed 10000 Mbps'),
  validityDays: z
    .union([z.number(), z.literal('')])
    .refine((v) => v !== '' && Number(v) > 0, 'Validity must be a positive number'),
  price: z
    .union([z.number(), z.literal('')])
    .refine((v) => v !== '' && Number(v) >= 0, 'Price must be 0 or greater'),
  dataLimit: z.string().min(1, 'Data limit is required'),
  routerType: z.string(),
  features: z.array(z.string()),
  isActive: z.boolean(),
  sortOrder: z.union([z.number(), z.literal('')]),
});

const DEFAULT_FORM: PlanFormData = {
  name: '',
  displayName: '',
  description: '',
  planTag: '',
  category: 'standard',
  speedMbps: '',
  validityDays: '',
  price: '',
  dataLimit: 'Unlimited',
  routerType: '',
  features: [],
  isActive: true,
  sortOrder: '',
};

function planToFormData(plan: Plan): PlanFormData {
  return {
    name: plan.name,
    displayName: plan.displayName,
    description: plan.description,
    planTag: plan.planTag,
    category: plan.category,
    speedMbps: plan.speedMbps,
    validityDays: plan.validityDays,
    price: plan.price,
    dataLimit: plan.dataLimit,
    routerType: plan.routerType,
    features: [...plan.features],
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
  };
}

export function usePlanForm(existingPlan?: Plan) {
  const dispatch = useAppDispatch();
  const admin = useAppSelector((s) => s.auth.user);
  const [formData, setFormData] = useState<PlanFormData>(
    existingPlan ? planToFormData(existingPlan) : DEFAULT_FORM,
  );
  const [errors, setErrors] = useState<Partial<Record<keyof PlanFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateNameWarning, setDuplicateNameWarning] = useState(false);
  const displayNameManuallyEdited = useRef(!!existingPlan?.displayName);

  useEffect(() => {
    if (existingPlan) {
      setFormData(planToFormData(existingPlan));
      displayNameManuallyEdited.current = true;
    }
  }, [existingPlan]);

  const suggestedDisplayName = useMemo(() => {
    const speed = Number(formData.speedMbps);
    const days = Number(formData.validityDays);
    if (!speed || !days) return '';
    return `${speed} Mbps - ${formatValidity(days)}`;
  }, [formData.speedMbps, formData.validityDays]);

  const computedPerDayCost = useMemo(() => {
    const price = Number(formData.price);
    const days = Number(formData.validityDays);
    return computePerDayCost(price, days);
  }, [formData.price, formData.validityDays]);

  useEffect(() => {
    if (!displayNameManuallyEdited.current && suggestedDisplayName) {
      setFormData((prev) => ({ ...prev, displayName: suggestedDisplayName }));
    }
  }, [suggestedDisplayName]);

  useEffect(() => {
    void (async () => {
      const name = formData.displayName.trim();
      if (name.length < 3) {
        setDuplicateNameWarning(false);
        return;
      }
      try {
        const plans = await fetchPlans();
        const duplicate = plans.some(
          (p) =>
            p.displayName.toLowerCase() === name.toLowerCase() &&
            p.id !== existingPlan?.id,
        );
        setDuplicateNameWarning(duplicate);
      } catch {
        setDuplicateNameWarning(false);
      }
    })();
  }, [formData.displayName, existingPlan?.id]);

  const updateField = useCallback(<K extends keyof PlanFormData>(key: K, value: PlanFormData[K]) => {
    if (key === 'displayName') {
      displayNameManuallyEdited.current = true;
    }
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(existingPlan ? planToFormData(existingPlan) : DEFAULT_FORM);
    setErrors({});
    displayNameManuallyEdited.current = !!existingPlan;
  }, [existingPlan]);

  const validate = useCallback((): boolean => {
    const result = planFormSchema.safeParse(formData);
    if (result.success) {
      setErrors({});
      return true;
    }
    const fieldErrors: Partial<Record<keyof PlanFormData, string>> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof PlanFormData;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    setErrors(fieldErrors);
    return false;
  }, [formData]);

  const submitPlan = useCallback(
    async (options?: { duplicateAfterSave?: boolean }): Promise<Plan | null> => {
      if (!validate()) return null;
      if (!admin?.id) {
        dispatch(
          enqueueToast({
            id: `plan-auth-${Date.now()}`,
            type: 'error',
            message: 'You must be signed in to save plans.',
          }),
        );
        return null;
      }

      setIsSubmitting(true);
      try {
        const adminMeta = { id: admin.id, name: admin.name ?? 'Admin' };

        if (existingPlan) {
          await updatePlan(existingPlan.id, formData, adminMeta.name);
          if (options?.duplicateAfterSave) {
            const copy = await duplicatePlan(
              existingPlan.id,
              `Copy of ${formData.displayName}`,
              `${formData.planTag}_copy`,
              adminMeta.name,
            );
            dispatch(
              enqueueToast({
                id: `plan-dup-${Date.now()}`,
                type: 'success',
                message: `Plan duplicated — '${copy.displayName}' created`,
              }),
            );
            return copy;
          }
          dispatch(
            enqueueToast({
              id: `plan-upd-${Date.now()}`,
              type: 'success',
              message: 'Plan updated!',
            }),
          );
          return existingPlan;
        }

        const created = await createPlan(formData, adminMeta);
        dispatch(
          enqueueToast({
            id: `plan-new-${Date.now()}`,
            type: 'success',
            message: 'Plan created!',
          }),
        );
        return created;
      } catch (e) {
        dispatch(
          enqueueToast({
            id: `plan-err-${Date.now()}`,
            type: 'error',
            message: e instanceof Error ? e.message : 'Could not save plan',
          }),
        );
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [admin, dispatch, existingPlan, formData, validate],
  );

  return {
    formData,
    errors,
    updateField,
    submitPlan,
    resetForm,
    isSubmitting,
    computedPerDayCost,
    suggestedDisplayName,
    duplicateNameWarning,
    subscriberCount: existingPlan?.subscriberCount ?? 0,
  };
}
