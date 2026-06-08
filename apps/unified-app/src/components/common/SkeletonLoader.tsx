import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type SkeletonLoaderProps = {
  rows?: number;
  rowHeight?: number;
  shape?: 'line' | 'card' | 'circle';
  showAvatar?: boolean;
  tall?: boolean;
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

function SkeletonListRow({ tall }: { tall?: boolean }) {
  return (
    <View style={styles.listRow}>
      <SkeletonRow height={40} shape="circle" />
      <View style={styles.lines}>
        <SkeletonRow height={14} shape="line" />
        <SkeletonRow height={tall ? 48 : 12} shape={tall ? 'card' : 'line'} />
      </View>
    </View>
  );
}

export function SkeletonLoader({
  rows = 3,
  rowHeight = 16,
  shape = 'line',
  showAvatar = false,
  tall = false,
  style,
}: SkeletonLoaderProps) {
  const resolvedHeight = tall ? 120 : rowHeight;
  const resolvedShape = tall ? 'card' : shape;

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: rows }).map((_, index) =>
        showAvatar ? (
          <SkeletonListRow key={`skeleton-${index}`} tall={tall} />
        ) : (
          <SkeletonRow key={`skeleton-${index}`} height={resolvedHeight} shape={resolvedShape} />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, padding: spacing.md },
  bone: { backgroundColor: colors.borderDefault, width: '100%' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lines: { flex: 1, gap: spacing.xs },
});
