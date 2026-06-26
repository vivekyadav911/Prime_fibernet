import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { GlassCard, PressableScale } from '@/components/customer/ui';
import { signalGlass } from '@/theme/customer/signalGlass';

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
              <MaterialCommunityIcons name={action.icon} size={24} color={signalGlass.colors.onSurfaceVariant} />
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

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: signalGlass.spacing.gutter,
    marginTop: signalGlass.spacing.md,
  },
  cell: {
    width: '47%',
    flexGrow: 1,
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    borderRadius: signalGlass.radius.lg,
    gap: signalGlass.spacing.sm,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: signalGlass.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...signalGlass.typography.caption,
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.bodyMedium,
  },
});
