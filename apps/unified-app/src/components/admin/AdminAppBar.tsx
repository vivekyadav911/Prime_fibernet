import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/theme/spacing';
import {
  adminHeaderSubtitleStyle,
  adminHeaderTheme,
  adminHeaderTitleStyle,
} from '@/theme/adminHeader';

type AdminAppBarProps = {
  title: string;
  subtitle?: string;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
};

export function AdminAppBar({ title, subtitle, headerLeft, headerRight }: AdminAppBarProps) {
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
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.rightSlot}>{headerRight}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: adminHeaderTheme.background,
  },
  row: {
    height: adminHeaderTheme.rowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: adminHeaderTheme.horizontalPadding,
    backgroundColor: adminHeaderTheme.background,
  },
  leftSlot: {
    minWidth: adminHeaderTheme.buttonSize,
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
    minWidth: adminHeaderTheme.buttonSize,
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 2,
  },
  title: {
    ...adminHeaderTitleStyle,
    textAlign: 'center',
  },
  subtitle: {
    ...adminHeaderSubtitleStyle,
    textAlign: 'center',
    marginTop: 2,
  },
});
