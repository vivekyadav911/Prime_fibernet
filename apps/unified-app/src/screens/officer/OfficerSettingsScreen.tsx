import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { MfaEnrollModal } from '@/components/auth/MfaEnrollModal';
import { OfficerScreenWrapper } from '@/components/officer';
import { useGetPortalUnreadCountQuery } from '@/services/api/portalNotificationsApi';
import { usePendingContractSignature } from '@/hooks/officer';
import { signOut } from '@/hooks/useAuth';
import { useMfaGate } from '@/hooks/useMfaGate';
import { useAppDispatch } from '@/store/hooks';
import { navigateToOfficerProfile } from '@/navigation/officerShellNavigation';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import type { OfficerSettingsStackParamList } from '@/types/navigation';

type IconName = ComponentProps<typeof Ionicons>['name'];

type SettingsRow = {
  screen: keyof OfficerSettingsStackParamList;
  label: string;
  icon: IconName;
  showBadge?: boolean;
};

type SettingsActionRow = {
  id: string;
  label: string;
  icon: IconName;
  showBadge?: boolean;
  onPress: () => void;
};

type SettingsSection = {
  id: string;
  label: string;
  items: SettingsRow[];
};

const SECTIONS: SettingsSection[] = [
  {
    id: 'field',
    label: 'Field',
    items: [{ screen: 'Map', label: 'Map', icon: 'map-outline' }],
  },
  {
    id: 'assets',
    label: 'Assets',
    items: [{ screen: 'Inventory', label: 'Inventory', icon: 'cube-outline' }],
  },
  {
    id: 'workforce',
    label: 'Workforce',
    items: [
      { screen: 'Payslip', label: 'Payslip', icon: 'card-outline' },
      { screen: 'LeaveStack', label: 'Leave', icon: 'leaf-outline' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      { screen: 'NotificationsStack', label: 'Notifications', icon: 'notifications-outline', showBadge: true },
      { screen: 'Support', label: 'Support', icon: 'chatbubbles-outline' },
    ],
  },
];

function formatNavCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

export function OfficerSettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OfficerSettingsStackParamList>>();
  const dispatch = useAppDispatch();
  const { data: unreadNotifications = 0 } = useGetPortalUnreadCountQuery();
  const { needsSignature } = usePendingContractSignature();
  const mfa = useMfaGate();
  const [mfaOpen, setMfaOpen] = useState(false);

  const handleSignOut = useCallback(() => {
    void signOut(dispatch);
  }, [dispatch]);

  const accountExtras = useMemo((): SettingsActionRow[] => {
    return [
      {
        id: 'profile',
        label: 'Profile',
        icon: 'person-outline',
        onPress: () => {
          navigateToOfficerProfile(navigation);
        },
      },
      {
        id: 'contract',
        label: 'Employment Contract',
        icon: 'document-text-outline',
        showBadge: needsSignature,
        onPress: () => {
          navigateToOfficerProfile(navigation, {
            screen: 'EmploymentContract',
            params: needsSignature ? { highlightSign: true } : undefined,
          });
        },
      },
    ];
  }, [navigation, needsSignature]);

  const sectionNodes = useMemo(
    () =>
      SECTIONS.map((section) => (
        <View key={section.id} style={styles.section}>
          <Text style={styles.sectionLabel}>{section.label}</Text>
          {section.id === 'account'
            ? accountExtras.map((item) => (
                <Pressable key={item.id} style={styles.item} onPress={item.onPress}>
                  <Ionicons name={item.icon} size={22} color={colors.textSecondary} />
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  {item.showBadge ? (
                    <View style={styles.signDot}>
                      <Text style={styles.signDotText}>Sign</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </Pressable>
              ))
            : null}
          {section.items.map((item) => {
            const badgeCount = item.showBadge && unreadNotifications > 0 ? unreadNotifications : null;
            return (
              <Pressable
                key={item.screen}
                style={styles.item}
                onPress={() => navigation.navigate(item.screen)}
              >
                <Ionicons name={item.icon} size={22} color={colors.textSecondary} />
                <Text style={styles.itemLabel}>{item.label}</Text>
                {badgeCount != null ? (
                  <Text style={styles.navCount}>{formatNavCount(badgeCount)}</Text>
                ) : null}
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>
            );
          })}
        </View>
      )),
    [accountExtras, navigation, unreadNotifications],
  );

  return (
    <OfficerScreenWrapper>
      {sectionNodes}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Security</Text>
        <Pressable style={styles.item} onPress={() => setMfaOpen(true)}>
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.textSecondary} />
          <Text style={styles.itemLabel}>Two-factor authentication</Text>
          <Text style={styles.navCount}>{mfa.loading ? '' : mfa.enrolled ? 'On' : 'Off'}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
      <View style={styles.footer}>
        <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
      <MfaEnrollModal
        visible={mfaOpen}
        onClose={() => setMfaOpen(false)}
        onEnrolled={() => void mfa.refresh()}
      />
    </OfficerScreenWrapper>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceWhite,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.sm,
  },
  itemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  navCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    minWidth: 28,
    textAlign: 'right',
  },
  signDot: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.amberLight,
  },
  signDotText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.amber,
  },
  footer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderDefault,
  },
  signOutBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: adminColors.badgeBlocked,
    textAlign: 'center',
  },
});
