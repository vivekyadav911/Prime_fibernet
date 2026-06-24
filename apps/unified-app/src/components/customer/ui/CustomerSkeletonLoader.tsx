import { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { signalGlass } from '@/theme/customer/signalGlass';

type CustomerSkeletonLoaderProps = {
  rows?: number;
  rowHeight?: number;
  style?: ViewStyle;
};

function Bone({ height }: { height: number }) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.85, { duration: 900 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[styles.bone, { height, borderRadius: signalGlass.radius.sm }, animatedStyle]}
    />
  );
}

export function CustomerSkeletonLoader({
  rows = 3,
  rowHeight = 72,
  style,
}: CustomerSkeletonLoaderProps) {
  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: rows }).map((_, i) => (
        <Bone key={`sk-${i}`} height={rowHeight} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: signalGlass.spacing.sm, padding: signalGlass.spacing.lg },
  bone: {
    width: '100%',
    backgroundColor: signalGlass.colors.borderSubtle,
  },
});
