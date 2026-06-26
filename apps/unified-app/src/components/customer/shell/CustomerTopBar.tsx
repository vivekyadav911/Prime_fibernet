import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { signalGlass } from '@/theme/customer/signalGlass';
import { isBlurUnavailable } from '@/utils/expoRuntime';

type CustomerTopBarProps = {
  unreadCount?: number;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
  showProfileAvatar?: boolean;
};

export function CustomerTopBar({
  unreadCount = 0,
  onNotificationsPress,
  onProfilePress,
  showProfileAvatar = true,
}: CustomerTopBarProps) {
  const insets = useSafeAreaInsets();
  const useSolid = isBlurUnavailable();

  const content = (
    <View style={[styles.row, { paddingTop: insets.top + signalGlass.spacing.xs }]}>
      <View style={styles.left}>
        {showProfileAvatar ? (
          <Pressable
            onPress={onProfilePress}
            style={styles.avatar}
            accessibilityLabel="Profile"
            hitSlop={8}
          >
            <MaterialCommunityIcons name="account" size={22} color={signalGlass.colors.primary} />
          </Pressable>
        ) : null}
        <Text style={styles.brand}>Prime Fibernet</Text>
      </View>
      <Pressable
        onPress={onNotificationsPress}
        style={styles.bell}
        accessibilityLabel="Notifications"
        hitSlop={8}
      >
        <MaterialCommunityIcons name="bell-outline" size={26} color={signalGlass.colors.primary} />
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );

  if (useSolid) {
    return <View style={[styles.bar, styles.solidBar]}>{content}</View>;
  }

  return (
    <BlurView intensity={signalGlass.blur.barIntensity} tint="dark" style={styles.bar}>
      {content}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderBottomWidth: 1,
    borderBottomColor: signalGlass.colors.borderSubtle,
    paddingHorizontal: signalGlass.spacing.marginMobile,
    paddingBottom: signalGlass.spacing.sm,
  },
  solidBar: {
    backgroundColor: 'rgba(16,19,26,0.92)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: signalGlass.spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: signalGlass.colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brand: {
    ...signalGlass.typography.displayLg,
    fontSize: 22,
    lineHeight: 28,
    color: signalGlass.colors.primary,
    fontFamily: signalGlass.fonts.display,
    flexShrink: 1,
  },
  bell: {
    position: 'relative',
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 4,
    backgroundColor: signalGlass.colors.errorContainer,
    borderRadius: signalGlass.radius.pill,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: signalGlass.colors.onError,
    fontSize: 10,
    fontWeight: '700',
  },
});
