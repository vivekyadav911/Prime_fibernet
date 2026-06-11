import { StyleSheet, Text, View } from 'react-native';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type PermissionPillsProps = {
  roleName: string;
  permissions: string[];
};

export function PermissionPills({ roleName, permissions }: PermissionPillsProps) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Permissions for {roleName}</Text>
      <View style={styles.pills}>
        {permissions.length ? (
          permissions.map((perm) => (
            <View key={perm} style={styles.pill}>
              <Text style={styles.check}>✓</Text>
              <Text style={styles.pillText}>{perm}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No permissions configured for this role.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: adminColors.permissionBoxBg,
    borderWidth: 1,
    borderColor: adminColors.permissionBoxBorder,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: adminColors.primary,
    marginBottom: spacing.xs,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: adminColors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  check: { fontSize: 11, color: adminColors.badgeActive, fontWeight: '700' },
  pillText: { fontSize: 12, fontWeight: '600', color: colors.textPrimary, textTransform: 'uppercase' },
  empty: { fontSize: 13, color: colors.textSecondary },
});
