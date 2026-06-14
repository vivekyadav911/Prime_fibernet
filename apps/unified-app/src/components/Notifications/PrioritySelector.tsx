import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { NotificationPriority } from '@/types/notifications';
import { NOTIFICATION_PRIORITIES } from '@/types/notifications';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

const DOT_COLORS: Record<NotificationPriority, string> = {
  Low: '#9CA3AF',
  Normal: '#3B82F6',
  High: '#F97316',
  Urgent: '#EF4444',
};

type PrioritySelectorProps = {
  value: NotificationPriority;
  onChange: (priority: NotificationPriority) => void;
};

export function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  return (
    <View style={styles.row}>
      {NOTIFICATION_PRIORITIES.map((p) => {
        const active = value === p;
        return (
          <Pressable
            key={p}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => onChange(p)}
          >
            {active ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
            <View style={[styles.dot, { backgroundColor: DOT_COLORS[p] }]} />
            <Text style={[styles.label, active && styles.labelActive]}>{p}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  pillActive: {
    backgroundColor: adminColors.primary,
    borderColor: adminColors.primary,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  labelActive: {
    color: colors.white,
  },
});
