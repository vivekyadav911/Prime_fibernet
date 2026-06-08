import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type SkeletonLoaderProps = {
  rows?: number;
  rowHeight?: number;
  shape?: 'line' | 'card' | 'circle';
  style?: ViewStyle;
};

function SkeletonRow({ height, shape }: { height: number; shape: 'line' | 'card' | 'circle' }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const shapeStyle =
    shape === 'circle'
      ? { width: height, height, borderRadius: height / 2 }
      : shape === 'card'
        ? { height, borderRadius: radius.md }
        : { height, borderRadius: radius.sm };

  return <Animated.View style={[styles.bone, shapeStyle, { opacity }]} />;
}

export function SkeletonLoader({ rows = 3, rowHeight = 16, shape = 'line', style }: SkeletonLoaderProps) {
  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonRow key={`skeleton-${index}`} height={rowHeight} shape={shape} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, padding: spacing.md },
  bone: { backgroundColor: colors.borderDefault, width: '100%' },
});
