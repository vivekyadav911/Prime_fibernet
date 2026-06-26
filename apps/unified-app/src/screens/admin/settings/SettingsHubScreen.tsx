import { useEffect } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';


import { AdminScreenLayout, RoleGuard } from '@/components/admin';
import { SettingsMobileNav } from '@/components/admin/settings';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetAppSettingsQuery } from '@/store/api/endpoints';
import { useAppTheme } from '@/theme/ThemeProvider';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import { queryErrorMessage } from '@/utils/queryError';

export function SettingsHubScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const { data, isLoading, isError, error, refetch } = useGetAppSettingsQuery();
  const { applyFromSettings } = useAppTheme();

  useEffect(() => {
    if (data) applyFromSettings(data);
  }, [data, applyFromSettings]);

  if (isLoading) {
    return (
      <AdminScreenLayout>
        <SkeletonLoader rows={8} />
      </AdminScreenLayout>
    );
  }

  if (isError) {
    return (
      <AdminScreenLayout>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </AdminScreenLayout>
    );
  }

  if (isWide) {
    return (
      <RoleGuard requiredPermission="settings.view">
        <AdminScreenLayout>
          <ScrollView contentContainerStyle={styles.wideHint}>
            <SettingsMobileNav />
          </ScrollView>
        </AdminScreenLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard requiredPermission="settings.view">
      <AdminScreenLayout>
        <ScrollView contentContainerStyle={styles.mobileContent}>
          <SettingsMobileNav />
        </ScrollView>
      </AdminScreenLayout>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  mobileContent: { padding: 16, gap: 8 },
  wideHint: { padding: 16 },
});
