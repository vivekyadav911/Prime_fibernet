import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';


import { AdminScreenLayout, RoleGuard } from '@/components/admin';
import {
  SaveButton,
  SettingsHubLayout,
  SettingsRow,
  SettingsSection,
  SettingsSlider,
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

export function SystemSettingsScreen() {
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

  const onMaintenanceToggle = (v: boolean) => {
    if (v) {
      Alert.alert(
        'Enable Maintenance Mode?',
        'This will lock out non-admin users until maintenance mode is disabled.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', style: 'destructive', onPress: () => set('maintenanceMode', true) },
        ],
      );
      return;
    }
    set('maintenanceMode', false);
  };

  const handleSave = async () => {
    try {
      await updateSection({
        section: 'system',
        updates: form,
        description: 'Updated system settings',
      }).unwrap();
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'System settings saved' }));
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
      <SettingsSection title="Maintenance & Debug">
        <SettingsRow label="Maintenance Mode" value={form.maintenanceMode} onValueChange={onMaintenanceToggle} />
        <SettingsRow label="Debug Mode" value={form.debugMode} onValueChange={(v) => set('debugMode', v)} />
        <SettingsRow label="Error Reporting" value={form.errorReporting} onValueChange={(v) => set('errorReporting', v)} />
      </SettingsSection>

      <SettingsSection title="Performance Settings">
        <SettingsRow label="Performance Monitoring" value={form.performanceMonitoring} onValueChange={(v) => set('performanceMonitoring', v)} />
        <SettingsRow label="Query Optimization" value={form.queryOptimization} onValueChange={(v) => set('queryOptimization', v)} />
        <SettingsSlider
          label="Session Timeout"
          value={form.sessionTimeoutMinutes ?? 30}
          minimumValue={5}
          maximumValue={120}
          unit=" min"
          onValueChange={(v) => set('sessionTimeoutMinutes', v)}
        />
        <SettingsSlider
          label="Cache Timeout"
          value={form.cacheTimeoutMinutes ?? 60}
          minimumValue={10}
          maximumValue={240}
          unit=" min"
          onValueChange={(v) => set('cacheTimeoutMinutes', v)}
        />
      </SettingsSection>

      <SettingsSection title="Backup Settings">
        <SettingsRow label="Auto Backup" value={form.autoBackup} onValueChange={(v) => set('autoBackup', v)} />
      </SettingsSection>

      <SaveButton label="Save System Settings" onPress={handleSave} loading={saving} />
    </>
  );

  return (
    <RoleGuard requiredPermission="settings.view">
      <AdminScreenLayout>
        <SettingsHubLayout activeRoute="System">
          <ScrollView contentContainerStyle={styles.content}>{body}</ScrollView>
        </SettingsHubLayout>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
});
