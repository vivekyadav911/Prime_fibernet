import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import { WEEKDAYS, isSameDay, startOfDay, toIsoDate } from './dateUtils';
import type { PickerAccent } from './pickerTheme';

type CalendarGridProps = {
  selected: Date;
  viewMonth: number;
  viewYear: number;
  onSelect: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  accent: PickerAccent;
};

export function CalendarGrid({
  selected,
  viewMonth,
  viewYear,
  onSelect,
  minimumDate,
  maximumDate,
  accent,
}: CalendarGridProps) {
  const minDay = minimumDate ? startOfDay(minimumDate) : null;
  const maxDay = maximumDate ? startOfDay(maximumDate) : null;

  const cells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const slots: Array<{ day: number | null; date: Date | null }> = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      slots.push({ day: null, date: null });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      slots.push({ day, date: new Date(viewYear, viewMonth, day) });
    }
    return slots;
  }, [viewMonth, viewYear]);

  const isDisabled = (date: Date): boolean => {
    const day = startOfDay(date);
    if (minDay && day < minDay) return true;
    if (maxDay && day > maxDay) return true;
    return false;
  };

  return (
    <View>
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={styles.weekdayLabel}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, index) => {
          if (!cell.day || !cell.date) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const disabled = isDisabled(cell.date);
          const active = isSameDay(cell.date, selected);

          return (
            <Pressable
              key={toIsoDate(cell.date)}
              style={[
                styles.dayCell,
                active && { backgroundColor: accent.accentColor },
                disabled && styles.dayCellDisabled,
              ]}
              disabled={disabled}
              onPress={() => onSelect(cell.date!)}
            >
              <Text
                style={[
                  styles.dayText,
                  active && styles.dayTextActive,
                  disabled && styles.dayTextDisabled,
                ]}
              >
                {cell.day}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  dayCellDisabled: {
    opacity: 0.35,
  },
  dayText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  dayTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  dayTextDisabled: {
    color: colors.textSecondary,
  },
});
