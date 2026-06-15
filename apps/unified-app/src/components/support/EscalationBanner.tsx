import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type EscalationBannerProps = {
  ticketNumber: string;
  priority: string;
  minutesOverdue: number;
  onPress?: () => void;
};

export function EscalationBanner({ ticketNumber, priority, minutesOverdue, onPress }: EscalationBannerProps) {
  const hours = Math.floor(minutesOverdue / 60);
  const mins = minutesOverdue % 60;
  const overdueLabel = hours > 0 ? `${hours}h ${mins}m overdue` : `${mins}m overdue`;

  return (
    <Pressable style={styles.banner} onPress={onPress}>
      <Ionicons name="warning" size={18} color={adminColors.badgeDanger} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {ticketNumber} — {priority}
        </Text>
        <Text style={styles.sub}>{overdueLabel}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={adminColors.badgeDanger} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  content: { flex: 1 },
  title: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  sub: { fontSize: 12, color: adminColors.badgeDanger },
});
