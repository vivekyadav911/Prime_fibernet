import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

type CustomerInfoHeaderProps = {
  name: string;
  accountId: string;
  statusLabel?: string;
  isActive?: boolean;
};

export function CustomerInfoHeader({ name, accountId, statusLabel = 'Active', isActive = true }: CustomerInfoHeaderProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.block}>
      <View style={styles.row}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
          {isActive ? <View style={styles.dotActive} /> : <View style={styles.dotInactive} />}
          <Text style={[styles.badgeText, isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
            {statusLabel}
          </Text>
        </View>
      </View>
      <Text style={styles.id}>{accountId}</Text>
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    block: {
      marginBottom: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    name: {
      ...theme.typography.displayMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
      flex: 1,
      minWidth: 0,
    },
    id: {
      ...theme.typography.monoMd,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.mono,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
    },
    badgeActive: {
      backgroundColor: 'rgba(78,222,163,0.1)',
      borderColor: 'rgba(78,222,163,0.2)',
    },
    badgeInactive: {
      backgroundColor: theme.colors.surfaceContainerLow,
      borderColor: theme.colors.borderSubtle,
    },
    dotActive: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.secondary,
    },
    dotInactive: {
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: theme.colors.onSurfaceVariant,
      backgroundColor: 'transparent',
    },
    badgeText: {
      ...theme.typography.caption,
      fontFamily: theme.fonts.bodySemiBold,
      fontWeight: '700',
    },
    badgeTextActive: {
      color: theme.colors.secondary,
    },
    badgeTextInactive: {
      color: theme.colors.onSurfaceVariant,
    },
  });
