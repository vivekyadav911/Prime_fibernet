import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  CustomerInfoHeader,
  DashboardPlanCard,
  QuickActionsGrid,
  SpeedGauge,
} from '@/components/customer/dashboard';
import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { CustomerTopBar } from '@/components/customer/shell';
import { CustomerEmptyState, CustomerSkeletonLoader, CustomerToast, CustomerErrorState, FadeInSection } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import {
  useGetCustomerDashboardQuery,
  useGetCustomerProfileQuery,
} from '@/services/api';
import { useCustomerUiStore } from '@/store/customerUiStore';
import { useAppSelector } from '@/store/hooks';
import type { CustomerTheme } from '@/theme/customer';
import type { CustomerStackParamList, CustomerTabParamList } from '@/types/navigation';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<CustomerTabParamList, 'Home'>,
  NativeStackNavigationProp<CustomerStackParamList>
>;

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const styles = useThemedStyles(createStyles);
  const { theme } = useCustomerTheme();
  const authUser = useAppSelector((s) => s.auth.user);
  const { data: profile } = useGetCustomerProfileQuery(undefined, { skip: !authUser });
  const userId = profile?.id ?? authUser?.id ?? '';
  const { data, isLoading, error, refetch, isFetching } = useGetCustomerDashboardQuery(userId, {
    skip: !userId,
  });
  const toast = useCustomerUiStore((s) => s.toast);
  const clearToast = useCustomerUiStore((s) => s.clearToast);

  const connectionStatus = useMemo(() => {
    if (!data?.subscription) return 'expired' as const;
    if (data.subscription.isOverdue) return 'expired' as const;
    if (data.subscription.status === 'suspended') return 'suspended' as const;
    return 'active' as const;
  }, [data?.subscription]);

  if (isLoading && !data) {
    return (
      <View style={styles.canvas}>
        <CustomerTopBar />
        <View style={styles.body}>
          <CustomerSkeletonLoader rows={4} rowHeight={88} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.canvas}>
        <CustomerTopBar />
        <View style={styles.body}>
          <CustomerErrorState message="We couldn't load your dashboard. Check your connection and try again." onRetry={refetch} />
        </View>
      </View>
    );
  }

  const sub = data?.subscription;
  const displayName = data?.profile.name ?? authUser?.name ?? 'Customer';
  const accountId = data?.profile.customerId ?? `ACC-${userId.slice(0, 8)}`;
  const isActive = connectionStatus === 'active';

  return (
    <View style={styles.canvas}>
      <CustomerToast
        title={toast?.title ?? ''}
        body={toast?.body}
        visible={Boolean(toast)}
        onDismiss={clearToast}
      />
      <CustomerTopBar
        unreadCount={data?.unreadNotifications ?? 0}
        onNotificationsPress={() => navigation.navigate('Notifications')}
        onProfilePress={() => navigation.navigate('Profile')}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <FadeInSection delayMs={0}>
          <CustomerInfoHeader
            name={displayName}
            accountId={accountId}
            statusLabel={isActive ? 'Active' : connectionStatus === 'suspended' ? 'Suspended' : 'Inactive'}
            isActive={isActive}
          />
        </FadeInSection>

        <FadeInSection delayMs={100}>
          <View style={styles.heroRow}>
            <View style={styles.gaugeCol}>
              <SpeedGauge speedMbps={sub?.speedMbps ?? 100} maxSpeedMbps={sub?.speedMbps ?? 500} />
            </View>
            {sub ? (
              <View style={styles.planCol}>
                <DashboardPlanCard
                  planName={sub.planName}
                  renewalDate={sub.endAt}
                  isUnlimited={sub.isUnlimited}
                  onPayNow={() => navigation.navigate('Payments')}
                />
              </View>
            ) : null}
          </View>
        </FadeInSection>

        {!sub ? (
          <FadeInSection delayMs={200}>
            <CustomerEmptyState
              title="No active plan"
              subtitle="Browse plans to get connected"
              actionLabel="Browse Plans"
              onAction={() => navigation.navigate('Plans')}
              icon="◎"
            />
          </FadeInSection>
        ) : null}

        <FadeInSection delayMs={300}>
          <QuickActionsGrid
            actions={[
              { id: 'pay', label: 'Pay Bill', icon: 'receipt', onPress: () => navigation.navigate('Payments') },
              { id: 'tickets', label: 'My Tickets', icon: 'ticket-confirmation-outline', onPress: () => navigation.navigate('CustomerTicketList') },
              { id: 'plan', label: 'Change Plan', icon: 'swap-horizontal', onPress: () => navigation.navigate('Plans') },
              { id: 'support', label: 'Support', icon: 'headset', onPress: () => navigation.navigate('Support') },
            ]}
          />
        </FadeInSection>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    canvas: {
      flex: 1,
      backgroundColor: theme.colors.bgDeep,
    },
    body: {
      flex: 1,
      padding: theme.spacing.marginMobile,
    },
    scroll: {
      paddingHorizontal: theme.spacing.marginMobile,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xxxl,
    },
    heroRow: {
      gap: theme.spacing.gutter,
    },
    gaugeCol: {},
    planCol: {},
  });
