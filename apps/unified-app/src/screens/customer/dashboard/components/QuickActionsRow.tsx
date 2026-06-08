import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type QuickAction = {
  id: string;
  label: string;
  icon: string;
  tint: string;
  onPress: () => void;
};

type QuickActionsRowProps = {
  actions: QuickAction[];
};

export function QuickActionsRow({ actions }: QuickActionsRowProps) {
  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <Pressable key={action.id} style={styles.card} onPress={action.onPress}>
          <View style={[styles.iconWrap, { backgroundColor: `${action.tint}22` }]}>
            <Text style={styles.icon}>{action.icon}</Text>
          </View>
          <Text style={styles.label}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '48%',
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  iconWrap: {
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  icon: { fontSize: 22 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
});
