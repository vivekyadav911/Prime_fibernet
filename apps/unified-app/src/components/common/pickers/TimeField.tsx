import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import { TimePickerSheet } from './TimePickerSheet';
import { defaultPickerAccent, type PickerAccent } from './pickerTheme';
import {
  formatDisplayTime,
  resolveDraftTime,
  toTimeString,
} from './timeUtils';

export type TimeFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  minuteStep?: number;
  accentColor?: string;
  accentTint?: string;
};

export function TimeField({
  label,
  value,
  onChange,
  error,
  placeholder = 'Select time',
  minuteStep = 1,
  accentColor,
  accentTint,
}: TimeFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [draftHour, setDraftHour] = useState(() => resolveDraftTime(value).hour);
  const [draftMinute, setDraftMinute] = useState(() => resolveDraftTime(value).minute);

  const accent: PickerAccent = useMemo(
    () => ({
      accentColor: accentColor ?? defaultPickerAccent.accentColor,
      accentTint: accentTint ?? defaultPickerAccent.accentTint,
    }),
    [accentColor, accentTint],
  );

  const displayValue = useMemo(() => formatDisplayTime(value), [value]);

  const openPicker = useCallback(() => {
    const draft = resolveDraftTime(value);
    setDraftHour(draft.hour);
    setDraftMinute(draft.minute);
    setShowPicker(true);
  }, [value]);

  const closePicker = useCallback(() => setShowPicker(false), []);

  const confirmTime = useCallback(() => {
    onChange(toTimeString(draftHour, draftMinute));
    setShowPicker(false);
  }, [draftHour, draftMinute, onChange]);

  const handleChange = useCallback((hour: number, minute: number) => {
    setDraftHour(hour);
    setDraftMinute(minute);
  }, []);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.trigger, error ? styles.triggerError : null]}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={[styles.triggerText, !displayValue && styles.placeholder]}>
          {displayValue || placeholder}
        </Text>
        <Text style={styles.clockIcon}>🕐</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TimePickerSheet
        visible={showPicker}
        hour={draftHour}
        minute={draftMinute}
        onChange={handleChange}
        onClose={closePicker}
        onConfirm={confirmTime}
        minuteStep={minuteStep}
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
  clockIcon: { fontSize: 18, marginLeft: spacing.xs },
  error: { color: colors.errorRed, fontSize: 12, marginTop: spacing.xxs },
});
