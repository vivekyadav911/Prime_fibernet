import { useEffect } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Screen } from '@prime/ui';

import { RoleGuard } from '@/components/admin';
import { SettingsMobileNav } from '@/components/admin/settings';
import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetAppSettingsQuery } from '@/store/api/endpoints';
import { useAppTheme } from '@/theme/ThemeProvider';
import { adminColors } from '@/theme/admin';
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
      <Screen style={styles.screen}>
        <SkeletonLoader rows={8} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen style={styles.screen}>
        <ErrorState message={queryErrorMessage(error)} onRetry={refetch} />
      </Screen>
    );
  }

  if (isWide) {
    return (
      <RoleGuard requiredPermission="settings.view">
        <Screen style={styles.screen}>
          <ScrollView contentContainerStyle={styles.wideHint}>
            <SettingsMobileNav />
          </ScrollView>
        </Screen>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard requiredPermission="settings.view">
      <Screen style={styles.screen}>
        <ScrollView contentContainerStyle={styles.mobileContent}>
          <SettingsMobileNav />
        </ScrollView>
      </Screen>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: adminColors.canvasBg },
  mobileContent: { padding: 16, gap: 8 },
  wideHint: { padding: 16 },
});
