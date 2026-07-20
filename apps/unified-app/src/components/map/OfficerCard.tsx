import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDistanceToNow } from 'date-fns';

import { AvatarIcon } from '@/components/admin/AvatarIcon';
import { getOfficerColor } from '@/constants/mapTheme';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { OfficerLocation } from '@/types/map';
import { OFFLINE_THRESHOLD_MS } from '@/types/map';

type Props = {
  officer: OfficerLocation;
  colorIndex: number;
  onPress: () => void;
};

export function OfficerCard({ officer, colorIndex, onPress }: Props) {
  const name = officer.officer?.name ?? 'Officer';
  const color = officer.officer?.avatar_color ?? getOfficerColor(name, colorIndex);
  const isOffline =
    Date.now() - new Date(officer.last_seen_at).getTime() > OFFLINE_THRESHOLD_MS;
  const lastSeen = formatDistanceToNow(new Date(officer.last_seen_at), { addSuffix: true });
  const battery = officer.battery_level;

  return (
    <Pressable style={[styles.card, isOffline && styles.cardOffline]} onPress={onPress}>
      <View style={styles.avatarWrap}>
        <AvatarIcon name={name} uri={officer.officer?.avatar_url} size={44} />
        <View style={[styles.statusDot, { backgroundColor: isOffline ? colors.textSecondary : color }]} />
      </View>
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      <Text style={styles.meta}>⏱ {lastSeen}</Text>
      <Text style={styles.coords}>
        📍 {officer.latitude.toFixed(4)}, {officer.longitude.toFixed(4)}
      </Text>
      {battery != null ? (
        <Text style={[styles.battery, batteryStyle(battery)]}>🔋 {battery}%</Text>
      ) : null}
      <View style={[styles.statusBar, { backgroundColor: isOffline ? colors.textSecondary : '#10B981' }]} />
    </Pressable>
  );
}

function batteryStyle(level: number) {
  if (level > 50) return styles.batteryGood;
  if (level > 20) return styles.batteryWarn;
  return styles.batteryLow;
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    backgroundColor: colors.surfaceWhite,
    borderRadius: 12,
    padding: spacing.sm,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  cardOffline: { opacity: 0.75 },
  avatarWrap: {
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  statusDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.surfaceWhite,
  },
  name: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  meta: { fontSize: 11, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },
  coords: { fontSize: 10, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  battery: { fontSize: 10, marginTop: 2, textAlign: 'center', fontWeight: '600' },
  batteryGood: { color: '#10B981' },
  batteryWarn: { color: '#F59E0B' },
  batteryLow: { color: '#EF4444' },
  statusBar: { height: 3, borderRadius: 2, marginTop: spacing.sm },
});
