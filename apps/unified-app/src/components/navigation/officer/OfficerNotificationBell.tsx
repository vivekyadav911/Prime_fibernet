import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';

import { useGetPortalUnreadCountQuery } from '@/services/api/portalNotificationsApi';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

export function OfficerNotificationBell() {
  const navigation = useNavigation();
  const { data: unread = 0 } = useGetPortalUnreadCountQuery();

  const openNotifications = useCallback(() => {
    navigation.dispatch(DrawerActions.jumpTo('NotificationsStack'));
  }, [navigation]);

  return (
    <Pressable
      style={styles.wrap}
      onPress={openNotifications}
      accessibilityLabel="Notifications"
    >
      <Text style={styles.icon}>🔔</Text>
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginRight: spacing.sm, padding: spacing.xs },
  icon: { fontSize: 20, color: colors.white },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: radius.full,
    backgroundColor: colors.errorRed,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },
});
