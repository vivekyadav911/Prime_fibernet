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
    <View style={styles.row}>
      <View style={styles.textBlock}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.id}>ID: {accountId}</Text>
      </View>
      <View style={[styles.badge, isActive && styles.badgeActive]}>
        {isActive ? <View style={styles.dot} /> : null}
        <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>{statusLabel}</Text>
      </View>
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    textBlock: { flex: 1, minWidth: 0 },
    name: {
      ...theme.typography.displayMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
    },
    id: {
      ...theme.typography.monoMd,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.mono,
      marginTop: 4,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.radius.pill,
      backgroundColor: 'rgba(78,222,163,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(78,222,163,0.2)',
    },
    badgeActive: {},
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.secondary,
    },
    badgeText: {
      ...theme.typography.caption,
      color: theme.colors.secondary,
      fontFamily: theme.fonts.bodySemiBold,
      fontWeight: '700',
    },
    badgeTextActive: {
      color: theme.colors.secondary,
    },
  });
