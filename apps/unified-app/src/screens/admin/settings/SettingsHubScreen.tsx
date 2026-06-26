import { useEffect } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Screen } from '@prime/ui';

import { RoleGuard } from '@/components/admin';
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
      <Screen style={adminScreenStyles.canvas}>
        <SkeletonLoader rows={8} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen style={adminScreenStyles.canvas}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  if (isWide) {
    return (
      <RoleGuard requiredPermission="settings.view">
        <Screen style={adminScreenStyles.canvas}>
          <ScrollView contentContainerStyle={styles.wideHint}>
            <SettingsMobileNav />
          </ScrollView>
        </Screen>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard requiredPermission="settings.view">
      <Screen style={adminScreenStyles.canvas}>
        <ScrollView contentContainerStyle={styles.mobileContent}>
          <SettingsMobileNav />
        </ScrollView>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  mobileContent: { padding: 16, gap: 8 },
  wideHint: { padding: 16 },
});
