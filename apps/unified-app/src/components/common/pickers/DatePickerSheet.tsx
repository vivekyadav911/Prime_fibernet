import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import { CalendarGrid } from './CalendarGrid';
import { MonthNavigator } from './MonthNavigator';
import { YearScrollPicker } from './YearScrollPicker';
import {
  clampDate,
  daysInMonth,
  defaultYearRange,
  startOfDay,
} from './dateUtils';
import { defaultPickerAccent, type PickerAccent } from './pickerTheme';

type DatePickerSheetProps = {
  visible: boolean;
  selected: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  minYear?: number;
  maxYear?: number;
  accent?: PickerAccent;
};

export function DatePickerSheet({
  visible,
  selected,
  onSelect,
  onClose,
  onConfirm,
  title = 'Select date',
  minimumDate,
  maximumDate,
  minYear: minYearProp,
  maxYear: maxYearProp,
  accent = defaultPickerAccent,
}: DatePickerSheetProps) {
  const { minYear: defaultMin, maxYear: defaultMax } = defaultYearRange(minimumDate, maximumDate);
  const minYear = minYearProp ?? defaultMin;
  const maxYear = maxYearProp ?? defaultMax;

  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const [viewYear, setViewYear] = useState(selected.getFullYear());

  useEffect(() => {
    if (visible) {
      setViewMonth(selected.getMonth());
      setViewYear(selected.getFullYear());
    }
  }, [visible, selected]);

  const handleMonthChange = useCallback(
    (month: number, year: number) => {
      setViewMonth(month);
      setViewYear(year);
      const maxDay = daysInMonth(year, month);
      const day = Math.min(selected.getDate(), maxDay);
      const next = clampDate(new Date(year, month, day), minimumDate, maximumDate);
      onSelect(next);
    },
    [maximumDate, minimumDate, onSelect, selected],
  );

  const handleYearChange = useCallback(
    (year: number) => {
      setViewYear(year);
      const maxDay = daysInMonth(year, viewMonth);
      const day = Math.min(selected.getDate(), maxDay);
      const next = clampDate(new Date(year, viewMonth, day), minimumDate, maximumDate);
      onSelect(next);
    },
    [maximumDate, minimumDate, onSelect, selected, viewMonth],
  );

  const handleDaySelect = useCallback(
    (date: Date) => {
      onSelect(clampDate(startOfDay(date), minimumDate, maximumDate));
    },
    [maximumDate, minimumDate, onSelect],
  );

  const doneTextStyle = useMemo(
    () => [styles.sheetAction, styles.sheetDone, { color: accent.accentColor }],
    [accent.accentColor],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.sheetAction}>Cancel</Text>
            </Pressable>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onConfirm} hitSlop={12}>
              <Text style={doneTextStyle}>Done</Text>
            </Pressable>
          </View>

          <View style={styles.body}>
            <MonthNavigator
              month={viewMonth}
              year={viewYear}
              onMonthChange={handleMonthChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              accent={accent}
            />
            <YearScrollPicker
              value={viewYear}
              onChange={handleYearChange}
              minYear={minYear}
              maxYear={maxYear}
              accent={accent}
            />
            <CalendarGrid
              selected={selected}
              viewMonth={viewMonth}
              viewYear={viewYear}
              onSelect={handleDaySelect}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              accent={accent}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.xl,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  sheetAction: { fontSize: 16, color: colors.textSecondary, minWidth: 56 },
  sheetDone: { fontWeight: '600', textAlign: 'right' },
  body: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
});
