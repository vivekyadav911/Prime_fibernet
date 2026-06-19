import type { ReactNode } from 'react';
import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

type FadeInSectionProps = {
  children: ReactNode;
  delayMs?: number;
};

export function FadeInSection({ children, delayMs = 0 }: FadeInSectionProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(delayMs, withTiming(1, { duration: 350 }));
    translateY.value = withDelay(delayMs, withTiming(0, { duration: 350 }));
  }, [delayMs, opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
