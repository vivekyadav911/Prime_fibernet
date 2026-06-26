import { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BottomTabBar } from '@react-navigation/bottom-tabs';

import { signalGlass } from '@/theme/customer/signalGlass';

export function AnimatedTabBar(props: BottomTabBarProps) {
  const { state } = props;
  const tabCount = state.routes.length;
  const tabWidth = Dimensions.get('window').width / tabCount;
  const indicatorX = useSharedValue(state.index * tabWidth);

  useEffect(() => {
    indicatorX.value = withTiming(state.index * tabWidth, { duration: 220 });
  }, [indicatorX, state.index, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View style={styles.wrap}>
      <BottomTabBar {...props} />
      <Animated.View style={[styles.indicator, { width: tabWidth }, indicatorStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    backgroundColor: signalGlass.colors.accentPrimary,
  },
});
