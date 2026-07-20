import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@prime/ui';
import type { AppRole } from '@prime/types';

import { colors } from '@/theme/colors';
import { adminColors } from '@/theme/admin';
import { radius, spacing } from '@/theme/spacing';
import type { AuthStackParamList } from '@/types/navigation';

type RoleOption = {
  role: AppRole;
  label: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  accent: string;
  /** Customer/Officer apps are mobile-only; only Admin is usable on web. */
  mobileOnly: boolean;
};

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'customer',
    label: 'Customer',
    description: 'Plans, payments & support',
    icon: 'account',
    accent: colors.primaryNavy,
    mobileOnly: true,
  },
  {
    role: 'officer',
    label: 'Officer',
    description: 'Field jobs, shifts & collections',
    icon: 'badge-account-horizontal',
    accent: colors.primaryNavy,
    mobileOnly: true,
  },
  {
    role: 'admin',
    label: 'Admin',
    description: 'Users, finance & settings',
    icon: 'shield-account',
    accent: adminColors.primary,
    mobileOnly: false,
  },
];

const isWeb = Platform.OS === 'web';

export function LandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  return (
    <Screen safeAreaTop padded>
      <View style={styles.header}>
        <Text style={styles.title}>Prime Fibernet</Text>
        <Text style={styles.subtitle}>Choose how you want to sign in</Text>
      </View>
      <View style={styles.cards}>
        {ROLE_OPTIONS.map((option) => {
          const disabled = isWeb && option.mobileOnly;
          return (
            <Pressable
              key={option.role}
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => navigation.navigate('Login', { role: option.role })}
              style={({ pressed }) => [
                styles.card,
                pressed && !disabled ? styles.cardPressed : null,
                disabled ? styles.cardDisabled : null,
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: option.accent }]}>
                <MaterialCommunityIcons name={option.icon} size={24} color={colors.surfaceWhite} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardLabel}>{option.label}</Text>
                <Text style={styles.cardDescription}>
                  {disabled ? 'Available on the mobile app only' : option.description}
                </Text>
              </View>
              {!disabled ? (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={colors.textSecondary}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xxl, marginBottom: spacing.xl },
  title: { fontSize: 28, fontWeight: '700', color: colors.primaryNavy, textAlign: 'center' },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  cards: { gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  cardPressed: { opacity: 0.7 },
  cardDisabled: { opacity: 0.5 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  cardDescription: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});
