import { StyleSheet, Text, View } from 'react-native';

import { signalGlass } from '@/theme/customer/signalGlass';

type CustomerInfoHeaderProps = {
  name: string;
  accountId: string;
  statusLabel?: string;
  isActive?: boolean;
};

export function CustomerInfoHeader({ name, accountId, statusLabel = 'Active', isActive = true }: CustomerInfoHeaderProps) {
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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: signalGlass.spacing.md,
    gap: signalGlass.spacing.sm,
  },
  textBlock: { flex: 1, minWidth: 0 },
  name: {
    ...signalGlass.typography.displayMd,
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.bodySemiBold,
  },
  id: {
    ...signalGlass.typography.monoMd,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.mono,
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: signalGlass.radius.pill,
    backgroundColor: 'rgba(78,222,163,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(78,222,163,0.2)',
  },
  badgeActive: {},
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: signalGlass.colors.secondary,
  },
  badgeText: {
    ...signalGlass.typography.caption,
    color: signalGlass.colors.secondary,
    fontFamily: signalGlass.fonts.bodySemiBold,
    fontWeight: '700',
  },
  badgeTextActive: {
    color: signalGlass.colors.secondary,
  },
});
