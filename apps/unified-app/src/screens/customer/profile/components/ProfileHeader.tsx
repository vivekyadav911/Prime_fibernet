import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { signalGlass } from '@/theme/customer/signalGlass';

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
    <LinearGradient colors={[...signalGlass.gradients.hero]} style={styles.card}>
      <View style={styles.avatarWrap}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.avatar} accessibilityLabel="Profile photo" />
        ) : (
          <View style={styles.initials}>
            <Text style={styles.initialsText}>{initials(name)}</Text>
          </View>
        )}
        {onChangePhoto ? (
          <Pressable
            style={styles.cameraBtn}
            onPress={onChangePhoto}
            disabled={uploading}
            accessibilityLabel="Change profile photo"
            hitSlop={8}
          >
            {uploading ? (
              <ActivityIndicator color={signalGlass.colors.accentPrimary} size="small" />
            ) : (
              <Text style={styles.cameraIcon}>📷</Text>
            )}
          </Pressable>
        ) : null}
        {uploading ? (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator color={signalGlass.colors.white} />
          </View>
        ) : null}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
      <Text style={styles.email} numberOfLines={1}>
        {email}
      </Text>
      {isDev ? <Text style={styles.devBadge}>Dev account</Text> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: signalGlass.radius.lg,
    padding: signalGlass.spacing.xl,
    alignItems: 'center',
    gap: signalGlass.spacing.xs,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
  },
  avatarWrap: { position: 'relative', marginBottom: signalGlass.spacing.sm },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 4,
    borderColor: signalGlass.colors.borderSubtle,
  },
  initials: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 4,
    borderColor: signalGlass.colors.borderSubtle,
    backgroundColor: signalGlass.colors.bgGlass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 36,
    fontWeight: '700',
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.display,
  },
  cameraBtn: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: signalGlass.colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
  },
  cameraIcon: { fontSize: 16 },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: signalGlass.colors.overlay,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.display,
    textAlign: 'center',
  },
  email: { color: signalGlass.colors.textSecondary, fontSize: 14 },
  devBadge: { color: signalGlass.colors.accentWarning, fontSize: 12, marginTop: signalGlass.spacing.xs },
});
