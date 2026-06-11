import { Pressable, StyleSheet, Text, View } from 'react-native';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export type QuickAccessItem = {
  id: string;
  label: string;
  icon: string;
  route: string;
};

type QuickAccessGridProps = {
  items: QuickAccessItem[];
  onPress: (route: string) => void;
};

export function QuickAccessGrid({ items, onPress }: QuickAccessGridProps) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <Pressable key={item.id} style={styles.card} onPress={() => onPress(item.route)}>
          <Text style={styles.icon}>{item.icon}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: {
    width: '23%',
    minWidth: 100,
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  icon: { fontSize: 28, marginBottom: spacing.xs },
  label: { fontSize: 12, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },
});
