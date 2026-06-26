import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CHECK_LENGTH = 36;

type PaymentSuccessCheckmarkProps = {
  size?: number;
};

export function PaymentSuccessCheckmark({ size = 88 }: PaymentSuccessCheckmarkProps) {
  const { theme } = useCustomerTheme();
  const styles = useThemedStyles(createStyles);
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withTiming(1, { duration: 600 });
  }, [progress, reduceMotion]);

  const animatedPathProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - progress.value),
  }));

  const radius = size / 2;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: radius,
        },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 88 88">
        <Circle
          cx="44"
          cy="44"
          r="40"
          stroke={theme.colors.accentSuccess}
          strokeWidth="2"
          fill="rgba(16,185,129,0.2)"
        />
        <AnimatedPath
          d="M26 44 L38 56 L62 32"
          stroke={theme.colors.accentSuccess}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={CHECK_LENGTH}
          animatedProps={animatedPathProps}
        />
      </Svg>
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    wrap: {
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.xl,
      borderWidth: 2,
      borderColor: theme.colors.accentSuccess,
      backgroundColor: 'rgba(16,185,129,0.15)',
    },
  });
