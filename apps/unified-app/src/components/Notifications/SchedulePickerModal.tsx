import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { DateField, TimeField } from '@/components/common/pickers';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type SchedulePickerModalProps = {
  visible: boolean;
  value: Date | null;
  timezone?: string;
  onClose: () => void;
  onConfirm: (date: Date) => void;
};

function combineDateTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
}

function formatDisplayDate(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const h = date.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} at ${hour12}:${min} ${ampm}`;
}

export function SchedulePickerModal({
  visible,
  value,
  timezone = 'Asia/Kolkata',
  onClose,
  onConfirm,
}: SchedulePickerModalProps) {
  const initial = value ?? new Date(Date.now() + 30 * 60 * 1000);
  const [dateStr, setDateStr] = useState(
    `${initial.getFullYear()}-${String(initial.getMonth() + 1).padStart(2, '0')}-${String(initial.getDate()).padStart(2, '0')}`,
  );
  const [timeStr, setTimeStr] = useState(
    `${String(initial.getHours()).padStart(2, '0')}:${String(initial.getMinutes()).padStart(2, '0')}`,
  );

  useEffect(() => {
    if (value) {
      setDateStr(
        `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`,
      );
      setTimeStr(
        `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`,
      );
    }
  }, [value, visible]);

  const combined = combineDateTime(dateStr, timeStr);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Pressable onPress={onClose}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.title}>Schedule</Text>
            <Pressable onPress={() => onConfirm(combined)}>
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>
          <View style={styles.body}>
            <DateField
              label="Date"
              value={dateStr}
              onChange={setDateStr}
              minimumDate={new Date()}
              accentColor={adminColors.primary}
            />
            <TimeField
              label="Time"
              value={timeStr}
              onChange={setTimeStr}
              accentColor={adminColors.primary}
            />
            <Text style={styles.preview}>{formatDisplayDate(combined)}</Text>
            <Text style={styles.tz}>IST ({timezone})</Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export { formatDisplayDate as formatScheduleDisplay };

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  cancel: { color: colors.textSecondary, fontSize: 15 },
  title: { fontSize: 16, fontWeight: '700' },
  done: { color: adminColors.primary, fontSize: 15, fontWeight: '600' },
  body: { padding: spacing.md, gap: spacing.md },
  preview: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginTop: spacing.sm },
  tz: { fontSize: 13, color: colors.textSecondary },
});
