import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { QuickAccessGrid, type QuickAccessItem } from '@/components/admin';
import { adminColors } from '@/theme/admin';
import { radius, spacing } from '@/theme/spacing';

import { DashboardSectionHeader } from './DashboardSectionHeader';

type DashboardShortcutsProps = {
  primaryItems: QuickAccessItem[];
  onPress: (route: string) => void;
  secondaryContent?: ReactNode;
};

export function DashboardShortcuts({
  primaryItems,
  onPress,
  secondaryContent,
}: DashboardShortcutsProps) {
  return (
    <View style={styles.panel}>
      <DashboardSectionHeader title="Go to" hint="Most used" />
      <View style={styles.primaryCard}>
        <QuickAccessGrid items={primaryItems} onPress={onPress} />
      </View>
      {secondaryContent}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.xs,
  },
  primaryCard: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: adminColors.dashboard.panelBorder,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxs,
  },
});
