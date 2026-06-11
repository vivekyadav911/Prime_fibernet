import { StyleSheet, Text } from 'react-native';
import { adminColors } from '@/theme/admin';
import { spacing } from '@/theme/spacing';

type SectionLabelProps = {
  title: string;
};

export function SectionLabel({ title }: SectionLabelProps) {
  return <Text style={styles.label}>{title}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: adminColors.sectionLabel,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
});
