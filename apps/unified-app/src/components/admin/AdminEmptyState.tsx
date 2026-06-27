import { StyleSheet, Text, View } from 'react-native';

import { AdminButton } from './AdminButton';
import { Ionicons } from '@expo/vector-icons';
import { adminDesign } from '@/theme/adminDesign';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type AdminEmptyStateProps = {
  title: string;
  subtitle?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
};

export function AdminEmptyState({
  title,
  subtitle,
  iconName = 'folder-open-outline',
  actionLabel,
  onAction,
}: AdminEmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={iconName} size={32} color={adminColors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? <AdminButton label={actionLabel} onPress={onAction} style={styles.btn} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: adminColors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { ...adminDesign.typography.sectionTitle, textAlign: 'center' },
  subtitle: { ...adminDesign.typography.meta, marginTop: spacing.xs, textAlign: 'center', maxWidth: 280 },
  btn: { marginTop: spacing.lg, alignSelf: 'stretch', maxWidth: 280 },
});
