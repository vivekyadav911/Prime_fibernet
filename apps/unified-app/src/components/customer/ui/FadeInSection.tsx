import type { ReactNode } from 'react';
import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { signalGlass } from '@/theme/customer/signalGlass';

type FadeInSectionProps = {
  children: ReactNode;
  delayMs?: number;
};

export function FadeInSection({ children, delayMs = 0 }: FadeInSectionProps) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const translateY = useSharedValue(reduceMotion ? 0 : 20);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }
    const duration = signalGlass.motion.fadeDurationMs;
    opacity.value = withDelay(delayMs, withTiming(1, { duration }));
    translateY.value = withDelay(delayMs, withTiming(0, { duration }));
  }, [delayMs, opacity, reduceMotion, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
