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
import { formatElapsedHeader } from '@/utils/formatElapsed';

export function ShiftPulseChip() {
  const { isActive, elapsed } = useActiveShift();
  const elapsedLabel = formatElapsedHeader(elapsed);
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
    <View
      style={styles.chip}
      accessibilityLabel={`Shift active, ${elapsedLabel} elapsed`}
      accessibilityRole="text"
    >
      <Animated.View style={[styles.dot, dotStyle]} />
      <Text style={styles.time} numberOfLines={1}>
        {elapsedLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.emeraldLight,
    paddingHorizontal: spacing.xxs,
    paddingVertical: 2,
    borderRadius: radius.full,
    gap: 4,
    maxWidth: 56,
    flexShrink: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.emerald,
  },
  time: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
});
