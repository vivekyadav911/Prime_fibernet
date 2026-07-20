import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';

import { navigateToOfficerSettingsNotifications } from '@/navigation/officerShellNavigation';
import { useGetPortalUnreadCountQuery } from '@/services/api/portalNotificationsApi';
import { colors } from '@/theme/colors';
import { officerHeaderTheme } from '@/theme/officerHeader';
import { radius } from '@/theme/spacing';

export function OfficerNotificationBell() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { data: unread = 0 } = useGetPortalUnreadCountQuery();

  const openNotifications = useCallback(() => {
    navigateToOfficerSettingsNotifications(navigation);
  }, [navigation]);

  return (
    <Pressable
      style={styles.wrap}
      onPress={openNotifications}
      accessibilityLabel="Notifications"
      hitSlop={8}
    >
      <Ionicons name="notifications-outline" size={22} color={colors.white} />
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: officerHeaderTheme.buttonSize,
    height: officerHeaderTheme.buttonSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: radius.full,
    backgroundColor: colors.errorRed,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: colors.white, fontSize: 9, fontWeight: '700' },
});
