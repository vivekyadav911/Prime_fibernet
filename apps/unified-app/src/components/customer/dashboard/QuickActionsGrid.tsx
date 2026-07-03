import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { GlassCard, PressableScale } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

export type QuickAction = {
  id: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
};

type QuickActionsGridProps = {
  actions: QuickAction[];
};

export function QuickActionsGrid({ actions }: QuickActionsGridProps) {
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();

  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <PressableScale
          key={action.id}
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={styles.cell}
        >
          <GlassCard style={styles.card} padded>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name={action.icon} size={32} color={theme.colors.onSurfaceVariant} />
            </View>
            <Text style={styles.label} numberOfLines={1}>
              {action.label}
            </Text>
          </GlassCard>
        </PressableScale>
      ))}
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.gutter,
      marginTop: theme.spacing.md,
    },
    cell: {
      width: '47%',
      flexGrow: 1,
    },
    card: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 100,
      borderRadius: theme.radius.lg,
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceContainer,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      ...theme.typography.caption,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodyMedium,
    },
  });
