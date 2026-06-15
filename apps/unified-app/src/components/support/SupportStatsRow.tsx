import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/spacing';

type SupportStatsRowProps = {
  children: ReactNode;
};

export function SupportStatsRow({ children }: SupportStatsRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {children}
    </ScrollView>
  );
}

type SupportStatsGridProps = {
  children: ReactNode;
};

export function SupportStatsGrid({ children }: SupportStatsGridProps) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xxs,
  },
});
