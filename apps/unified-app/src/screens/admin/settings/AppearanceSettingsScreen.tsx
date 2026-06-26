import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';


import { AdminScreenLayout, RoleGuard } from '@/components/admin';
import {
  SaveButton,
  SettingsHubLayout,
  SettingsRow,
  SettingsSection,
  SettingsSelect,
  SettingsSlider,
} from '@/components/admin/settings';
import { ErrorState, SkeletonLoader } from '@/components/common';
import {
  useGetAppSettingsQuery,
  useUpdateAppSettingsSectionMutation,
} from '@/store/api/endpoints';
import { useAppDispatch } from '@/store/hooks';
import { enqueueToast } from '@/store/slices/uiSlice';
import { useAppTheme } from '@/theme/ThemeProvider';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import type { AppSettings } from '@/types/settings';
import { queryErrorMessage } from '@/utils/queryError';

const THEME_MODES = [
  { value: 'system', label: 'System Default' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];
const COLOR_SCHEMES = [
  { value: 'purple', label: 'Purple' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'orange', label: 'Orange' },
];
const LAYOUT_OPTIONS = [
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' },
];

export function AppearanceSettingsScreen() {
  const dispatch = useAppDispatch();
  const { applyFromSettings } = useAppTheme();
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
        section: 'appearance',
        updates: form,
        description: 'Updated appearance settings',
      }).unwrap();
      applyFromSettings(form);
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'Appearance settings saved' }));
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
      <SettingsSection title="Theme & Colors">
        <SettingsSelect label="Theme Mode" value={form.themeMode ?? 'system'} options={THEME_MODES} onSelect={(v) => set('themeMode', v as AppSettings['themeMode'])} />
        <SettingsSelect label="Color Scheme" value={form.colorScheme ?? 'purple'} options={COLOR_SCHEMES} onSelect={(v) => set('colorScheme', v)} />
        <SettingsRow label="Enable Dark Mode" value={form.darkModeEnabled} onValueChange={(v) => set('darkModeEnabled', v)} />
      </SettingsSection>

      <SettingsSection title="Display Settings">
        <SettingsSlider label="Font Size" value={form.fontSize ?? 14} minimumValue={10} maximumValue={20} unit="px" onValueChange={(v) => set('fontSize', v)} />
        <SettingsRow label="Compact Mode" value={form.compactMode} onValueChange={(v) => set('compactMode', v)} />
        <SettingsRow label="Enable Animations" value={form.animationsEnabled} onValueChange={(v) => set('animationsEnabled', v)} />
      </SettingsSection>

      <SettingsSection title="Layout Settings">
        <SettingsSelect label="Dashboard Layout" value={form.dashboardLayout ?? 'grid'} options={LAYOUT_OPTIONS} onSelect={(v) => set('dashboardLayout', v as AppSettings['dashboardLayout'])} />
        <SettingsRow label="Show User Avatars" value={form.showAvatars} onValueChange={(v) => set('showAvatars', v)} />
        <SettingsRow label="Show Notification Badges" value={form.showNotificationBadges} onValueChange={(v) => set('showNotificationBadges', v)} />
      </SettingsSection>

      <SaveButton label="Save Appearance Settings" onPress={handleSave} loading={saving} />
    </>
  );

  return (
    <RoleGuard requiredPermission="settings.view">
      <AdminScreenLayout>
        <SettingsHubLayout activeRoute="Appearance">
          <ScrollView contentContainerStyle={styles.content}>{body}</ScrollView>
        </SettingsHubLayout>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
});
