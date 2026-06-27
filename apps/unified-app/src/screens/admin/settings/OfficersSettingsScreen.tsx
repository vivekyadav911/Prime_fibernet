import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

import { AdminButton, AdminScreenLayout, RoleGuard } from '@/components/admin';
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
import type { AdminDrawerParamList } from '@/types/navigation';
import type { AppSettings } from '@/types/settings';
import { queryErrorMessage } from '@/utils/queryError';
import { spacing } from '@/theme/spacing';

export function OfficersSettingsScreen() {
  const dispatch = useAppDispatch();
  const drawerNav = useNavigation<NavigationProp<AdminDrawerParamList>>();
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
        section: 'officers',
        updates: form,
        description: 'Updated officers settings',
      }).unwrap();
      dispatch(enqueueToast({ id: Date.now().toString(), type: 'success', message: 'Officers settings saved' }));
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
      <SettingsSection title="Location & Tracking">
        <SettingsRow label="Enable Officer Tracking" value={form.officerTrackingEnabled} onValueChange={(v) => set('officerTrackingEnabled', v)} />
        <SettingsRow label="Enable Location Tracking" value={form.locationTrackingEnabled} onValueChange={(v) => set('locationTrackingEnabled', v)} />
        <SettingsSlider
          label="Update Interval"
          value={form.locationUpdateIntervalMinutes ?? 5}
          minimumValue={1}
          maximumValue={60}
          unit=" min"
          onValueChange={(v) => set('locationUpdateIntervalMinutes', v)}
        />
      </SettingsSection>

      <SettingsSection title="Attendance & Shifts">
        <SettingsRow label="Enable Attendance Tracking" value={form.attendanceTrackingEnabled} onValueChange={(v) => set('attendanceTrackingEnabled', v)} />
        <SettingsRow label="Enable Shift Management" value={form.shiftManagementEnabled} onValueChange={(v) => set('shiftManagementEnabled', v)} />
        <AdminButton
          label="Manage Office Hours"
          variant="secondary"
          onPress={() => drawerNav.navigate('Attendance', { screen: 'ShiftManagement' })}
          style={styles.linkBtn}
        />
      </SettingsSection>

      <SettingsSection title="Assignment Settings">
        <SettingsRow label="Auto-Assign Requests" value={form.autoAssignRequests} onValueChange={(v) => set('autoAssignRequests', v)} />
      </SettingsSection>

      <SaveButton label="Save Officers Settings" onPress={handleSave} loading={saving} />
    </>
  );

  return (
    <RoleGuard requiredPermission="settings.view">
      <AdminScreenLayout>
        <SettingsHubLayout activeRoute="Officers">
          <ScrollView contentContainerStyle={styles.content}>{body}</ScrollView>
        </SettingsHubLayout>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  linkBtn: { marginTop: spacing.sm },
});
