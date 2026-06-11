import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { spacing } from '@/theme/spacing';

import { DateField } from './DateField';
import { parseIsoDate } from './dateUtils';
import { defaultPickerAccent, type PickerAccent } from './pickerTheme';

export type DateRangePickerProps = {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  fromLabel?: string;
  toLabel?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  accentColor?: string;
  accentTint?: string;
};

export function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
  fromLabel = 'From',
  toLabel = 'To',
  minimumDate,
  maximumDate,
  accentColor,
  accentTint,
}: DateRangePickerProps) {
  const toMinimumDate = useMemo(() => {
    const parsed = parseIsoDate(from);
    if (!parsed) return minimumDate;
    if (minimumDate && parsed < minimumDate) return minimumDate;
    return parsed;
  }, [from, minimumDate]);

  const accent: PickerAccent = useMemo(
    () => ({
      accentColor: accentColor ?? defaultPickerAccent.accentColor,
      accentTint: accentTint ?? defaultPickerAccent.accentTint,
    }),
    [accentColor, accentTint],
  );

  return (
    <View style={styles.row}>
      <View style={styles.field}>
        <DateField
          label={fromLabel}
          value={from}
          onChange={onFromChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          accentColor={accent.accentColor}
          accentTint={accent.accentTint}
        />
      </View>
      <View style={styles.field}>
        <DateField
          label={toLabel}
          value={to}
          onChange={onToChange}
          minimumDate={toMinimumDate}
          maximumDate={maximumDate}
          accentColor={accent.accentColor}
          accentTint={accent.accentTint}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  field: {
    flex: 1,
  },
});
