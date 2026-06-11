import { StyleSheet, Text, View } from 'react-native';
import { adminColors } from '@/theme/admin';
import { radius } from '@/theme/spacing';

const AVATAR_COLORS = ['#5B4FCF', '#0D7377', '#1B3A6B', '#7C3AED', '#D4820A', '#C0392B'];

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? adminColors.primary;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

type AvatarIconProps = { name: string; size?: number };

export function AvatarIcon({ name, size = 40 }: AvatarIconProps) {
  const bg = hashColor(name);
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  text: { color: adminColors.sidebarBg, fontWeight: '700' },
});
