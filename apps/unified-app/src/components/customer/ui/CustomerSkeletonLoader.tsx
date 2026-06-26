import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

type CustomerSkeletonLoaderProps = {
  rows?: number;
  rowHeight?: number;
  style?: ViewStyle;
};

function Bone({ height, boneStyle }: { height: number; boneStyle: ViewStyle }) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.85, { duration: 900 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[boneStyle, { height }, animatedStyle]}
    />
  );
}

export function CustomerSkeletonLoader({
  rows = 3,
  rowHeight = 72,
  style,
}: CustomerSkeletonLoaderProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: rows }).map((_, i) => (
        <Bone key={`sk-${i}`} height={rowHeight} boneStyle={styles.bone} />
      ))}
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    container: { gap: theme.spacing.sm, padding: theme.spacing.lg },
    bone: {
      width: '100%',
      backgroundColor: theme.colors.borderSubtle,
      borderRadius: theme.radius.sm,
    },
  });
