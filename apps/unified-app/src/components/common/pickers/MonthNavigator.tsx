import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import { MONTHS, canNavigateMonth } from './dateUtils';
import type { PickerAccent } from './pickerTheme';

const SWIPE_THRESHOLD = 40;

type MonthNavigatorProps = {
  month: number;
  year: number;
  onMonthChange: (month: number, year: number) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  accent: PickerAccent;
};

export function MonthNavigator({
  month,
  year,
  onMonthChange,
  minimumDate,
  maximumDate,
  accent,
}: MonthNavigatorProps) {
  const canGoPrev = useMemo(
    () => canNavigateMonth(year, month, -1, minimumDate, maximumDate),
    [year, month, minimumDate, maximumDate],
  );
  const canGoNext = useMemo(
    () => canNavigateMonth(year, month, 1, minimumDate, maximumDate),
    [year, month, minimumDate, maximumDate],
  );

  const goToPreviousMonth = () => {
    if (!canGoPrev) return;
    if (month === 0) {
      onMonthChange(11, year - 1);
      return;
    }
    onMonthChange(month - 1, year);
  };

  const goToNextMonth = () => {
    if (!canGoNext) return;
    if (month === 11) {
      onMonthChange(0, year + 1);
      return;
    }
    onMonthChange(month + 1, year);
  };

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onEnd((event) => {
      if (event.translationX <= -SWIPE_THRESHOLD) {
        goToNextMonth();
      } else if (event.translationX >= SWIPE_THRESHOLD) {
        goToPreviousMonth();
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
        <Pressable
          onPress={goToPreviousMonth}
          hitSlop={12}
          style={navBtnStyle}
          disabled={!canGoPrev}
        >
          <Text style={[navBtnTextStyle, !canGoPrev && styles.navBtnDisabled]}>‹</Text>
        </Pressable>
        <Text style={styles.title}>
          {MONTHS[month]} {year}
        </Text>
        <Pressable
          onPress={goToNextMonth}
          hitSlop={12}
          style={navBtnStyle}
          disabled={!canGoNext}
        >
          <Text style={[navBtnTextStyle, !canGoNext && styles.navBtnDisabled]}>›</Text>
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
    letterSpacing: -0.2,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '600',
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
});
