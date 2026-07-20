import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
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
  const [leftWidth, setLeftWidth] = useState(0);
  const [rightWidth, setRightWidth] = useState(0);

  const titleInset = Math.max(leftWidth, rightWidth, officerHeaderTheme.buttonSize) + spacing.xs;

  const onLeftLayout = useCallback((width: number) => {
    setLeftWidth((prev) => (prev === width ? prev : width));
  }, []);

  const onRightLayout = useCallback((width: number) => {
    setRightWidth((prev) => (prev === width ? prev : width));
  }, []);

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={styles.row}>
        <View
          style={styles.sideSlot}
          onLayout={(e) => onLeftLayout(e.nativeEvent.layout.width)}
        >
          {headerLeft}
        </View>
        <View style={styles.spacer} />
        <View
          style={styles.sideSlot}
          onLayout={(e) => onRightLayout(e.nativeEvent.layout.width)}
        >
          {headerRight}
        </View>
        <View
          style={[styles.titleOverlay, { left: titleInset, right: titleInset }]}
          pointerEvents="none"
        >
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {title}
          </Text>
        </View>
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
  sideSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    maxWidth: '50%',
    zIndex: 2,
  },
  spacer: {
    flex: 1,
    minWidth: spacing.xs,
  },
  titleOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  title: {
    ...officerHeaderTitleStyle,
    textAlign: 'center',
    width: '100%',
  },
});
