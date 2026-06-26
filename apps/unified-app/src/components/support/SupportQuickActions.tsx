import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type QuickAction = {
  label: string;
  icon: string;
  onPress: () => void;
};

type SupportQuickActionsProps = {
  actions: QuickAction[];
};

export function SupportQuickActions({ actions }: SupportQuickActionsProps) {
  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <View key={action.label} style={styles.cell}>
          <Pressable style={styles.card} onPress={action.onPress}>
            <Text style={styles.icon}>{action.icon}</Text>
            <Text style={styles.label} numberOfLines={2}>
              {action.label}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xxs,
  },
  cell: {
    width: '50%',
    paddingHorizontal: spacing.xxs,
    paddingBottom: spacing.sm,
  },
  card: {
    minHeight: 88,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  icon: { fontSize: 24, marginBottom: spacing.xs },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
