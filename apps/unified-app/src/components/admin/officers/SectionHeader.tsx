import { Pressable, StyleSheet, Text, View } from 'react-native';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type SectionHeaderProps = {
  icon: string;
  title: string;
  iconColor?: string;
  onEdit?: () => void;
};

export function SectionHeader({ icon, title, iconColor = adminColors.sectionIconBlue, onEdit }: SectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <Text style={[styles.icon, { color: iconColor }]}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      {onEdit ? (
        <Pressable onPress={onEdit} hitSlop={8} accessibilityLabel="Edit section">
          <Text style={styles.editIcon}>✎</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  icon: { fontSize: 18 },
  title: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  editIcon: { fontSize: 18, color: adminColors.primary, fontWeight: '600' },
});
