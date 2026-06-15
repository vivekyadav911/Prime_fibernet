import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import { DatePickerSheet } from './DatePickerSheet';
import {
  formatDisplayDate,
  resolveDraftDate,
  startOfDay,
  toIsoDate,
} from './dateUtils';
import { defaultPickerAccent, type PickerAccent } from './pickerTheme';

export type DateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  minYear?: number;
  maxYear?: number;
  accentColor?: string;
  accentTint?: string;
  containerStyle?: StyleProp<ViewStyle>;
  triggerStyle?: StyleProp<ViewStyle>;
  triggerTextStyle?: StyleProp<TextStyle>;
};

export function DateField({
  label,
  value,
  onChange,
  error,
  placeholder = 'Select date',
  minimumDate,
  maximumDate,
  minYear,
  maxYear,
  accentColor,
  accentTint,
  containerStyle,
  triggerStyle,
  triggerTextStyle,
}: DateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [draftDate, setDraftDate] = useState<Date>(() =>
    resolveDraftDate(value, minimumDate, maximumDate),
  );

  const accent: PickerAccent = useMemo(
    () => ({
      accentColor: accentColor ?? defaultPickerAccent.accentColor,
      accentTint: accentTint ?? defaultPickerAccent.accentTint,
    }),
    [accentColor, accentTint],
  );

  const displayValue = useMemo(() => formatDisplayDate(value), [value]);

  const openPicker = useCallback(() => {
    setDraftDate(resolveDraftDate(value, minimumDate, maximumDate));
    setShowPicker(true);
  }, [maximumDate, minimumDate, value]);

  const closePicker = useCallback(() => setShowPicker(false), []);

  const confirmDate = useCallback(() => {
    onChange(toIsoDate(draftDate));
    setShowPicker(false);
  }, [draftDate, onChange]);

  const handleSelect = useCallback((date: Date) => {
    setDraftDate(startOfDay(date));
  }, []);

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.trigger, triggerStyle, error ? styles.triggerError : null]}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={[styles.triggerText, triggerTextStyle, !displayValue && styles.placeholder]}>
          {displayValue || placeholder}
        </Text>
        <Text style={styles.calendarIcon}>📅</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <DatePickerSheet
        visible={showPicker}
        selected={draftDate}
        onSelect={handleSelect}
        onClose={closePicker}
        onConfirm={confirmDate}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        minYear={minYear}
        maxYear={maxYear}
        accent={accent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
    textTransform: 'uppercase',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceWhite,
  },
  triggerError: { borderColor: colors.errorRed },
  triggerText: { fontSize: 14, color: colors.textPrimary, flex: 1 },
  placeholder: { color: colors.textSecondary },
  calendarIcon: { fontSize: 18, marginLeft: spacing.xs },
  error: { color: colors.errorRed, fontSize: 12, marginTop: spacing.xxs },
});
