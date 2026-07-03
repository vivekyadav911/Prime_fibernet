import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/theme/spacing';
import { officerHeaderTheme, officerHeaderTitleStyle } from '@/theme/officerHeader';

type OfficerAppBarProps = {
  title: string;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
};

export function OfficerAppBar({ title, headerLeft, headerRight }: OfficerAppBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={styles.row}>
        <View style={styles.leftSlot}>{headerLeft}</View>
        <View style={styles.titleSlot} pointerEvents="none">
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View style={styles.rightSlot}>{headerRight}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: officerHeaderTheme.background,
  },
  row: {
    height: officerHeaderTheme.rowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: officerHeaderTheme.horizontalPadding,
  },
  leftSlot: {
    minWidth: officerHeaderTheme.buttonSize,
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 2,
  },
  titleSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    zIndex: 1,
  },
  rightSlot: {
    minWidth: officerHeaderTheme.buttonSize,
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    zIndex: 2,
  },
  title: {
    ...officerHeaderTitleStyle,
    textAlign: 'center',
  },
});
