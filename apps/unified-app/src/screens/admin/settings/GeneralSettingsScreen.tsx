import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';


import { AdminScreenLayout, FormField, RoleGuard } from '@/components/admin';
import {
  SaveButton,
  SettingsHubLayout,
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

const LANGUAGE_OPTIONS = [
  { value: 'English', label: 'English' },
  { value: 'Hindi', label: 'Hindi' },
];
const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR (₹)' },
  { value: 'USD', label: 'USD ($)' },
];
const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata' },
  { value: 'UTC', label: 'UTC' },
];
const DATE_FORMAT_OPTIONS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
];
const TIME_FORMAT_OPTIONS = [
  { value: '12h', label: '12 Hour' },
  { value: '24h', label: '24 Hour' },
];

export function GeneralSettingsScreen() {
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
        section: 'general',
        updates: form,
        description: 'Updated general settings',
      }).unwrap();
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'General settings saved' }));
    } catch (e) {
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'error', message: queryErrorMessage(e) }));
    }
  };

  const body = isLoading ? (
    <SkeletonLoader rows={8} />
  ) : isError ? (
    <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
  ) : (
    <>
      <SettingsSection title="Company Information">
        <FormField label="Company Name" value={form.companyName ?? ''} onChangeText={(v) => set('companyName', v)} />
        <FormField label="Contact Email" value={form.contactEmail ?? ''} onChangeText={(v) => set('contactEmail', v)} keyboardType="email-address" />
        <FormField label="Phone Number" value={form.phoneNumber ?? ''} onChangeText={(v) => set('phoneNumber', v)} keyboardType="phone-pad" />
        <FormField label="Office Address" value={form.officeAddress ?? ''} onChangeText={(v) => set('officeAddress', v)} multiline />
      </SettingsSection>

      <SettingsSection title="Regional Settings">
        <SettingsSelect label="Language" value={form.language ?? 'English'} options={LANGUAGE_OPTIONS} onSelect={(v) => set('language', v)} />
        <SettingsSelect label="Currency" value={form.currency ?? 'INR'} options={CURRENCY_OPTIONS} onSelect={(v) => set('currency', v)} />
        <SettingsSelect label="Timezone" value={form.timezone ?? 'Asia/Kolkata'} options={TIMEZONE_OPTIONS} onSelect={(v) => set('timezone', v)} />
        <SettingsSelect label="Date Format" value={form.dateFormat ?? 'DD/MM/YYYY'} options={DATE_FORMAT_OPTIONS} onSelect={(v) => set('dateFormat', v)} />
        <SettingsSelect label="Time Format" value={form.timeFormat ?? '24h'} options={TIME_FORMAT_OPTIONS} onSelect={(v) => set('timeFormat', v as AppSettings['timeFormat'])} />
      </SettingsSection>

      <SaveButton label="Save General Settings" onPress={handleSave} loading={saving} />
    </>
  );

  return (
    <RoleGuard requiredPermission="settings.view">
      <AdminScreenLayout>
        <SettingsHubLayout activeRoute="General">
          <ScrollView contentContainerStyle={styles.content}>{body}</ScrollView>
        </SettingsHubLayout>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
});
