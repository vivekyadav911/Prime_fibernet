import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator } from 'react-native';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type ProfileHeaderProps = {
  name: string;
  email: string;
  photoUrl?: string | null;
  isDev?: boolean;
  uploading?: boolean;
  onChangePhoto?: () => void;
};

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
}

export function ProfileHeader({
  name,
  email,
  photoUrl,
  isDev,
  uploading,
  onChangePhoto,
}: ProfileHeaderProps) {
  return (
    <LinearGradient colors={[colors.primaryNavy, colors.accentTeal]} style={styles.card}>
      <View style={styles.avatarWrap}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.initials}>
            <Text style={styles.initialsText}>{initials(name)}</Text>
          </View>
        )}
        {onChangePhoto ? (
          <Pressable style={styles.cameraBtn} onPress={onChangePhoto} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator color={colors.primaryNavy} size="small" />
            ) : (
              <Text style={styles.cameraIcon}>📷</Text>
            )}
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.email}>{email}</Text>
      {isDev ? <Text style={styles.devBadge}>Dev account</Text> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatarWrap: { position: 'relative', marginBottom: spacing.sm },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 4,
    borderColor: colors.white,
  },
  initials: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 4,
    borderColor: colors.white,
    backgroundColor: `${colors.white}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: { fontSize: 36, fontWeight: '700', color: colors.white },
  cameraBtn: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: { fontSize: 16 },
  name: { fontSize: 24, fontWeight: '700', color: colors.white },
  email: { color: colors.white, opacity: 0.9, fontSize: 14 },
  devBadge: { color: colors.warningAmber, fontSize: 12, marginTop: spacing.xxs },
});
