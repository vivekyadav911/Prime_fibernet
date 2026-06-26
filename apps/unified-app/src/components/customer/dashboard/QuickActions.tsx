import { ScrollView, StyleSheet, Text } from 'react-native';

import { PressableScale } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

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
  const styles = useThemedStyles(createStyles);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {actions.map((action) => (
        <PressableScale
          key={action.id}
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={styles.chip}
        >
          <Text style={styles.icon}>{action.icon}</Text>
          <Text style={styles.label} numberOfLines={1}>
            {action.label}
          </Text>
        </PressableScale>
      ))}
    </ScrollView>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    row: {
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingRight: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
    },
    chip: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.bgGlass,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      minWidth: 88,
      minHeight: 44,
    },
    icon: { fontSize: 22, marginBottom: theme.spacing.xs },
    label: {
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.bodyMedium,
      fontSize: 12,
      fontWeight: '600',
    },
  });
