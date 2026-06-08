import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

type WelcomeHeaderProps = {
  name: string;
};

export function WelcomeHeader({ name }: WelcomeHeaderProps) {
  const initial = name.trim().charAt(0).toUpperCase() || 'U';

  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.name}>{name}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 24, fontWeight: '700' },
  textBlock: { flex: 1 },
  greeting: { color: colors.textSecondary, fontSize: 14 },
  name: { color: colors.textPrimary, fontSize: 20, fontWeight: '700', marginTop: spacing.xxs },
});
