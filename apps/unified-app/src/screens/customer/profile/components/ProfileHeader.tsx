import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { signalGlass } from '@/theme/customer/signalGlass';

type ProfileHeaderProps = {
  name: string;
  email: string;
  photoUrl?: string | null;
  memberSince?: string;
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
  memberSince,
  isDev,
  uploading,
  onChangePhoto,
}: ProfileHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.avatarGlow} />
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
              <ActivityIndicator color={signalGlass.colors.primary} size="small" />
            ) : (
              <MaterialCommunityIcons name="camera" size={16} color={signalGlass.colors.primary} />
            )}
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
      <View style={styles.memberBadge}>
        <MaterialCommunityIcons name="check-decagram" size={14} color={signalGlass.colors.secondary} />
        <Text style={styles.memberText}>Member since {memberSince ?? '2021'}</Text>
      </View>
      {isDev ? <Text style={styles.devBadge}>Dev account · {email}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: signalGlass.spacing.lg,
    position: 'relative',
  },
  avatarGlow: {
    position: 'absolute',
    top: 8,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: signalGlass.colors.accentPrimaryMuted,
    opacity: 0.8,
  },
  avatarWrap: { position: 'relative', marginBottom: signalGlass.spacing.sm },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: 'rgba(173,198,255,0.5)',
  },
  initials: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: 'rgba(173,198,255,0.5)',
    backgroundColor: signalGlass.colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 32,
    fontWeight: '700',
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.display,
  },
  cameraBtn: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: signalGlass.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: signalGlass.colors.borderGlass,
  },
  name: {
    ...signalGlass.typography.displayMd,
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.bodySemiBold,
    textAlign: 'center',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: signalGlass.spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: signalGlass.radius.pill,
    backgroundColor: 'rgba(0,165,114,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(78,222,163,0.2)',
  },
  memberText: {
    ...signalGlass.typography.label,
    color: signalGlass.colors.secondary,
    fontFamily: signalGlass.fonts.bodyMedium,
    textTransform: 'uppercase',
  },
  devBadge: { color: signalGlass.colors.accentWarning, fontSize: 12, marginTop: signalGlass.spacing.xs },
});
