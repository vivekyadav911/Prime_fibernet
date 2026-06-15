import { Pressable, StyleSheet, Text, View } from 'react-native';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AgentStatus } from '@/hooks/useAgentAvailability';

type AgentStatusToggleProps = {
  status: AgentStatus;
  onChange: (status: AgentStatus) => void;
  loading?: boolean;
};

const OPTIONS: { value: AgentStatus; label: string; color: string }[] = [
  { value: 'online', label: 'Online', color: adminColors.badgeActive },
  { value: 'away', label: 'Away', color: adminColors.badgeWarning },
  { value: 'busy', label: 'Busy', color: adminColors.badgeDanger },
];

export function AgentStatusToggle({ status, onChange, loading }: AgentStatusToggleProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Agent Status</Text>
      <View style={styles.row}>
        {OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[styles.chip, status === opt.value && { backgroundColor: `${opt.color}22`, borderColor: opt.color }]}
            onPress={() => onChange(opt.value)}
            disabled={loading}
          >
            <View style={[styles.dot, { backgroundColor: opt.color }]} />
            <Text style={[styles.chipText, status === opt.value && { color: opt.color, fontWeight: '700' }]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 13, color: colors.textPrimary },
});
