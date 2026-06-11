import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import { clampMinute } from './timeUtils';
import type { PickerAccent } from './pickerTheme';

const SWIPE_THRESHOLD = 40;

type MinuteNavigatorProps = {
  minute: number;
  onMinuteChange: (minute: number) => void;
  step?: number;
  accent: PickerAccent;
};

export function MinuteNavigator({
  minute,
  onMinuteChange,
  step = 1,
  accent,
}: MinuteNavigatorProps) {
  const goToPrevious = () => {
    const next = minute - step;
    if (next < 0) {
      onMinuteChange(clampMinute(60 + next, step));
      return;
    }
    onMinuteChange(next);
  };

  const goToNext = () => {
    const next = minute + step;
    if (next > 59) {
      onMinuteChange(clampMinute(next - 60, step));
      return;
    }
    onMinuteChange(next);
  };

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onEnd((event) => {
      if (event.translationX <= -SWIPE_THRESHOLD) {
        goToNext();
      } else if (event.translationX >= SWIPE_THRESHOLD) {
        goToPrevious();
      }
    });

  const navBtnStyle = useMemo(
    () => [styles.navBtn, { backgroundColor: accent.accentTint }],
    [accent.accentTint],
  );
  const navBtnTextStyle = useMemo(
    () => [styles.navBtnText, { color: accent.accentColor }],
    [accent.accentColor],
  );

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.header}>
        <Pressable onPress={goToPrevious} hitSlop={12} style={navBtnStyle}>
          <Text style={navBtnTextStyle}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{String(minute).padStart(2, '0')} min</Text>
        <Pressable onPress={goToNext} hitSlop={12} style={navBtnStyle}>
          <Text style={navBtnTextStyle}>›</Text>
        </Pressable>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '600',
  },
});
