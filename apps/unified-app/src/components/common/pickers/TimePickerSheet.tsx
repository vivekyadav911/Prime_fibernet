import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import { HourScrollPicker } from './HourScrollPicker';
import { MinuteNavigator } from './MinuteNavigator';
import { defaultPickerAccent, type PickerAccent } from './pickerTheme';
import { clampMinute } from './timeUtils';

type TimePickerSheetProps = {
  visible: boolean;
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  minuteStep?: number;
  accent?: PickerAccent;
};

export function TimePickerSheet({
  visible,
  hour,
  minute,
  onChange,
  onClose,
  onConfirm,
  title = 'Select time',
  minuteStep = 1,
  accent = defaultPickerAccent,
}: TimePickerSheetProps) {
  const [draftHour, setDraftHour] = useState(hour);
  const [draftMinute, setDraftMinute] = useState(minute);

  useEffect(() => {
    if (visible) {
      setDraftHour(hour);
      setDraftMinute(minute);
    }
  }, [visible, hour, minute]);

  const handleHourChange = useCallback(
    (nextHour: number) => {
      setDraftHour(nextHour);
      onChange(nextHour, draftMinute);
    },
    [draftMinute, onChange],
  );

  const handleMinuteChange = useCallback(
    (nextMinute: number) => {
      const clamped = clampMinute(nextMinute, minuteStep);
      setDraftMinute(clamped);
      onChange(draftHour, clamped);
    },
    [draftHour, minuteStep, onChange],
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
            <MinuteNavigator
              minute={draftMinute}
              onMinuteChange={handleMinuteChange}
              step={minuteStep}
              accent={accent}
            />
            <HourScrollPicker value={draftHour} onChange={handleHourChange} accent={accent} />
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
