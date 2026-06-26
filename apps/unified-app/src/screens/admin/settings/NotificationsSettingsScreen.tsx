import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';


import { AdminScreenLayout, RoleGuard } from '@/components/admin';
import {
  SaveButton,
  SettingsHubLayout,
  SettingsRow,
  SettingsSection,
  SettingsSelect,
} from '@/components/admin/settings';
import { ErrorState, SkeletonLoader } from '@/components/common';
import {
  useGetAppSettingsQuery,
  useUpdateAppSettingsSectionMutation,
} from '@/store/api/endpoints';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import type { AppSettings } from '@/types/settings';
import { queryErrorMessage } from '@/utils/queryError';

const EMAIL_PROVIDERS = [
  { value: 'resend', label: 'Resend' },
  { value: 'sendgrid', label: 'SendGrid' },
  { value: 'smtp', label: 'SMTP' },
];
const SMS_PROVIDERS = [
  { value: 'twilio', label: 'Twilio' },
  { value: 'msg91', label: 'MSG91' },
];
const WHATSAPP_PROVIDERS = [
  { value: 'whatsapp_business_api', label: 'WhatsApp Business API' },
  { value: 'twilio', label: 'Twilio' },
];

export function NotificationsSettingsScreen() {
  const dispatch = useAppDispatch();
  const { data, isLoading, isError, error, refetch } = useGetAppSettingsQuery();
  const [updateSection, { isLoading: saving }] = useUpdateAppSettingsSectionMutation();
  const [form, setForm] = useState<Partial<AppSettings>>({});

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await updateSection({
        section: 'notifications',
        updates: form,
        description: 'Updated notification settings',
      }).unwrap();
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'Notification settings saved' }));
    } catch (e) {
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'error', message: queryErrorMessage(e) }));
    }
  };

  const body = isLoading ? (
    <SkeletonLoader rows={6} />
  ) : isError ? (
    <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
  ) : (
    <>
      <SettingsSection title="Notification Channels">
        <SettingsRow label="Email" value={form.notifEmail} onValueChange={(v) => set('notifEmail', v)} />
        {form.notifEmail ? (
          <SettingsSelect
            label="Email Provider"
            value={form.notifEmailProvider ?? 'resend'}
            options={EMAIL_PROVIDERS}
            onSelect={(v) => set('notifEmailProvider', v)}
          />
        ) : null}
        <SettingsRow label="SMS" value={form.notifSms} onValueChange={(v) => set('notifSms', v)} />
        {form.notifSms ? (
          <SettingsSelect label="SMS Provider" value={form.smsProvider ?? 'twilio'} options={SMS_PROVIDERS} onSelect={(v) => set('smsProvider', v)} />
        ) : null}
        <SettingsRow label="WhatsApp" value={form.notifWhatsapp} onValueChange={(v) => set('notifWhatsapp', v)} />
        {form.notifWhatsapp ? (
          <SettingsSelect
            label="WhatsApp Provider"
            value={form.notifWhatsappProvider ?? 'whatsapp_business_api'}
            options={WHATSAPP_PROVIDERS}
            onSelect={(v) => set('notifWhatsappProvider', v)}
          />
        ) : null}
        <SettingsRow label="Push Notifications" value={form.notifPush} onValueChange={(v) => set('notifPush', v)} />
        <SettingsRow label="In-App Notifications" value={form.notifInApp} onValueChange={(v) => set('notifInApp', v)} />
      </SettingsSection>

      <SettingsSection title="Notification Features">
        <SettingsRow
          label="Enable Notification Templates"
          value={form.notifTemplatesEnabled}
          onValueChange={(v) => set('notifTemplatesEnabled', v)}
        />
      </SettingsSection>

      <SaveButton label="Save Notification Settings" onPress={handleSave} loading={saving} />
    </>
  );

  return (
    <RoleGuard requiredPermission="settings.view">
      <AdminScreenLayout>
        <SettingsHubLayout activeRoute="Notifications">
          <ScrollView contentContainerStyle={styles.content}>{body}</ScrollView>
        </SettingsHubLayout>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
});
