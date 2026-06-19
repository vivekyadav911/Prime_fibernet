import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { signalGlass } from '@/theme/customer/signalGlass';

export type QuickAction = {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
};

type QuickActionsProps = {
  actions: QuickAction[];
};

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {actions.map((action) => (
        <Pressable
          key={action.id}
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={styles.chip}
        >
          <Text style={styles.icon}>{action.icon}</Text>
          <Text style={styles.label}>{action.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: signalGlass.spacing.sm,
    paddingVertical: signalGlass.spacing.sm,
    marginBottom: signalGlass.spacing.lg,
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: signalGlass.colors.bgGlass,
    borderRadius: signalGlass.radius.md,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
    paddingVertical: signalGlass.spacing.md,
    paddingHorizontal: signalGlass.spacing.lg,
    minWidth: 88,
  },
  icon: { fontSize: 22, marginBottom: signalGlass.spacing.xs },
  label: {
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.bodyMedium,
    fontSize: 12,
    fontWeight: '600',
  },
});
