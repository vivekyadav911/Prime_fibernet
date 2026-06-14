import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';

import {
  fetchTemplates,
  saveAsTemplate,
  saveDraft,
  scheduleNotification,
  sendNotification,
  updateNotification,
} from '@/services/broadcastNotificationService';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import type {
  AppNotification,
  CreateNotificationFormData,
  NotificationTemplate,
  SendProgress,
} from '@/types/notifications';
import { invalidateAudienceCountCache, resolveAudienceCount } from '@/utils/notificationUtils';

const DEFAULT_FORM: CreateNotificationFormData = {
  title: '',
  message: '',
  priority: 'Normal',
  eventType: 'none',
  audience: { type: 'all_users' },
  schedule: { isScheduled: false, scheduledAt: null, timezone: 'Asia/Kolkata' },
  tags: [],
  deepLinkUrl: '',
  imageUrl: '',
  templateId: null,
};

const draftSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
});

const sendSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  message: z.string().min(10, 'Message must be at least 10 characters').max(500),
  deepLinkUrl: z
    .string()
    .refine((v) => !v || v.startsWith('primefiber://') || v.startsWith('https://'), {
      message: 'Deep link must start with primefiber:// or https://',
    }),
});

function notificationToFormData(n: AppNotification): CreateNotificationFormData {
  return {
    title: n.title,
    message: n.message,
    priority: n.priority,
    eventType: n.eventType,
    audience: {
      type: n.audience.type,
      planId: n.audience.planId,
      planName: n.audience.planName,
      area: n.audience.area,
      userIds: n.audience.userIds,
      userNames: n.audience.userNames,
      officerIds: n.audience.officerIds,
    },
    schedule: {
      isScheduled: n.schedule.isScheduled,
      scheduledAt: n.schedule.scheduledAt,
      timezone: n.schedule.timezone,
    },
    tags: n.tags,
    deepLinkUrl: n.deepLinkUrl ?? '',
    imageUrl: n.imageUrl ?? '',
    templateId: null,
  };
}

export function useCreateNotification(
  existingNotification?: AppNotification,
  prefill?: Partial<CreateNotificationFormData>,
) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const admin = useMemo(
    () => ({ id: user?.id ?? 'admin', name: user?.name ?? user?.email ?? 'Admin' }),
    [user],
  );

  const [formData, setFormData] = useState<CreateNotificationFormData>(() => ({
    ...DEFAULT_FORM,
    ...(existingNotification ? notificationToFormData(existingNotification) : {}),
    ...prefill,
    audience: {
      ...DEFAULT_FORM.audience,
      ...(existingNotification ? notificationToFormData(existingNotification).audience : {}),
      ...(prefill?.audience ?? {}),
    },
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof CreateNotificationFormData | 'audience' | 'schedule', string>>>({});
  const [estimatedRecipientCount, setEstimatedRecipientCount] = useState(0);
  const [isResolvingCount, setIsResolvingCount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [sendProgress, setSendProgress] = useState<SendProgress | null>(null);
  const draftIdRef = useRef(existingNotification?.id);
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void fetchTemplates().then(setTemplates).catch(console.error);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setIsResolvingCount(true);
      void resolveAudienceCount(formData.audience)
        .then((count) => {
          if (!cancelled) setEstimatedRecipientCount(count);
        })
        .catch(() => {
          if (!cancelled) setEstimatedRecipientCount(0);
        })
        .finally(() => {
          if (!cancelled) setIsResolvingCount(false);
        });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [formData.audience]);

  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      if (!formData.title.trim()) return;
      void saveDraft(formData, admin, draftIdRef.current).then((saved) => {
        draftIdRef.current = saved.id;
      }).catch(() => undefined);
    }, 30000);
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [formData, admin]);

  const updateField = useCallback(<K extends keyof CreateNotificationFormData>(key: K, value: CreateNotificationFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const updateAudience = useCallback((audience: CreateNotificationFormData['audience']) => {
    invalidateAudienceCountCache();
    setFormData((prev) => ({ ...prev, audience }));
    setErrors((prev) => ({ ...prev, audience: undefined }));
  }, []);

  const updateSchedule = useCallback((schedule: CreateNotificationFormData['schedule']) => {
    setFormData((prev) => ({ ...prev, schedule }));
    setErrors((prev) => ({ ...prev, schedule: undefined }));
  }, []);

  const validateAudience = useCallback((): string | null => {
    const { audience } = formData;
    if (audience.type === 'specific_users' && (!audience.userIds?.length)) {
      return 'Select at least one user';
    }
    if (audience.type === 'specific_plan' && !audience.planId) {
      return 'Select a plan';
    }
    if (audience.type === 'specific_area' && !audience.area?.trim()) {
      return 'Enter an area name';
    }
    return null;
  }, [formData]);

  const validateSchedule = useCallback((): string | null => {
    if (!formData.schedule.isScheduled) return null;
    if (!formData.schedule.scheduledAt) return 'Select a scheduled date and time';
    const minTime = Date.now() + 5 * 60 * 1000;
    if (formData.schedule.scheduledAt.getTime() < minTime) {
      return 'Scheduled time must be at least 5 minutes in the future';
    }
    return null;
  }, [formData.schedule]);

  const saveDraftAction = useCallback(async (): Promise<AppNotification | null> => {
    const parsed = draftSchema.safeParse(formData);
    if (!parsed.success) {
      setErrors({ title: parsed.error.errors[0]?.message });
      return null;
    }
    setIsSavingDraft(true);
    try {
      const saved = await saveDraft(formData, admin, draftIdRef.current);
      draftIdRef.current = saved.id;
      dispatch(enqueueToast({ id: `draft-${Date.now()}`, type: 'success', message: 'Draft saved' }));
      return saved;
    } catch (e) {
      dispatch(enqueueToast({
        id: `draft-err-${Date.now()}`,
        type: 'error',
        message: e instanceof Error ? e.message : 'Failed to save draft',
      }));
      return null;
    } finally {
      setIsSavingDraft(false);
    }
  }, [formData, admin, dispatch]);

  const validateForSend = useCallback((): boolean => {
    const parsed = sendSchema.safeParse(formData);
    const newErrors: typeof errors = {};
    if (!parsed.success) {
      for (const err of parsed.error.errors) {
        const key = err.path[0] as keyof CreateNotificationFormData;
        newErrors[key] = err.message;
      }
    }
    const audienceErr = validateAudience();
    if (audienceErr) newErrors.audience = audienceErr;
    const scheduleErr = validateSchedule();
    if (scheduleErr) newErrors.schedule = scheduleErr;
    if (estimatedRecipientCount === 0) {
      newErrors.audience = 'No recipients found for the selected audience. Please adjust your targeting.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validateAudience, validateSchedule, estimatedRecipientCount]);

  const sendNow = useCallback(async (): Promise<AppNotification | null> => {
    if (!validateForSend()) return null;
    setIsSubmitting(true);
    setSendProgress({ total: estimatedRecipientCount, sent: 0, failed: 0, percent: 0 });
    try {
      let id = draftIdRef.current;
      if (id) {
        await updateNotification(id, formData, admin);
      } else {
        const saved = await saveDraft(formData, admin);
        id = saved.id;
        draftIdRef.current = id;
      }
      const result = await sendNotification(id, admin, (sent, failed, total) => {
        setSendProgress({
          total,
          sent,
          failed,
          percent: total ? Math.round(((sent + failed) / total) * 100) : 0,
        });
      });
      dispatch(enqueueToast({
        id: `sent-${Date.now()}`,
        type: 'success',
        message: `✓ Sent to ${result.delivery?.totalDelivered ?? 0}/${result.delivery?.totalTargeted ?? 0} recipients`,
      }));
      return result;
    } catch (e) {
      dispatch(enqueueToast({
        id: `send-err-${Date.now()}`,
        type: 'error',
        message: e instanceof Error ? e.message : 'Failed to send',
      }));
      return null;
    } finally {
      setIsSubmitting(false);
      setSendProgress(null);
    }
  }, [formData, admin, validateForSend, estimatedRecipientCount, dispatch]);

  const scheduleIt = useCallback(async (): Promise<boolean> => {
    if (!validateForSend()) return false;
    if (!formData.schedule.scheduledAt) return false;
    setIsSubmitting(true);
    try {
      let id = draftIdRef.current;
      if (id) {
        await updateNotification(id, formData, admin);
      } else {
        const saved = await saveDraft(formData, admin);
        id = saved.id;
        draftIdRef.current = id;
      }
      await scheduleNotification(id, formData.schedule.scheduledAt);
      dispatch(enqueueToast({ id: `sched-${Date.now()}`, type: 'success', message: 'Notification scheduled' }));
      return true;
    } catch (e) {
      dispatch(enqueueToast({
        id: `sched-err-${Date.now()}`,
        type: 'error',
        message: e instanceof Error ? e.message : 'Failed to schedule',
      }));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, admin, validateForSend, dispatch]);

  const applyTemplate = useCallback((template: NotificationTemplate) => {
    setFormData((prev) => ({
      ...prev,
      title: template.title,
      message: template.message,
      priority: template.priority,
      eventType: template.eventType,
      audience: { type: template.audienceType },
      templateId: template.id,
    }));
  }, []);

  const saveAsTemplateAction = useCallback(async (name: string) => {
    try {
      const t = await saveAsTemplate({
        name,
        title: formData.title,
        message: formData.message,
        priority: formData.priority,
        eventType: formData.eventType,
        audienceType: formData.audience.type,
      });
      setTemplates((prev) => [...prev, t]);
      dispatch(enqueueToast({ id: `tpl-${Date.now()}`, type: 'success', message: 'Template saved' }));
    } catch (e) {
      dispatch(enqueueToast({
        id: `tpl-err-${Date.now()}`,
        type: 'error',
        message: e instanceof Error ? e.message : 'Failed to save template',
      }));
    }
  }, [formData, dispatch]);

  return {
    formData,
    errors,
    updateField,
    updateAudience,
    updateSchedule,
    estimatedRecipientCount,
    isResolvingCount,
    titleLength: formData.title.length,
    messageLength: formData.message.length,
    saveDraft: saveDraftAction,
    sendNow,
    scheduleIt,
    isSubmitting,
    isSavingDraft,
    templates,
    applyTemplate,
    saveAsTemplate: saveAsTemplateAction,
    sendProgress,
    draftId: draftIdRef.current,
  };
}
