import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useActiveShift } from '@/hooks/officer';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export function ShiftPulseChip() {
  const { isActive, elapsedLabel } = useActiveShift();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!isActive) return;
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [isActive, opacity]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!isActive) return null;

  return (
    <View style={styles.chip}>
      <Animated.View style={[styles.dot, dotStyle]} />
      <Text style={styles.label}>SHIFT ON</Text>
      <Text style={styles.time}>{elapsedLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.emeraldLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    gap: spacing.xxs,
    marginRight: spacing.sm,
    minHeight: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.emerald,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.emerald,
    letterSpacing: 0.5,
  },
  time: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});
