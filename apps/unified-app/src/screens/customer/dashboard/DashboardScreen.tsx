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
import { CustomerTopBar } from '@/components/customer/shell';
import { CustomerFontProvider } from '@/components/customer/CustomerFontProvider';
import { CustomerEmptyState, CustomerSkeletonLoader, CustomerToast, CustomerErrorState, FadeInSection } from '@/components/customer/ui';
import {
  useGetCustomerDashboardQuery,
  useGetCustomerProfileQuery,
} from '@/services/api';
import { useCustomerUiStore } from '@/store/customerUiStore';
import { useAppSelector } from '@/store/hooks';
import { signalGlass } from '@/theme/customer/signalGlass';
import type { CustomerStackParamList, CustomerTabParamList } from '@/types/navigation';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<CustomerTabParamList, 'Home'>,
  NativeStackNavigationProp<CustomerStackParamList>
>;

function DashboardContent() {
  const navigation = useNavigation<Nav>();
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
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={signalGlass.colors.primary} />}
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

export function DashboardScreen() {
  return (
    <CustomerFontProvider>
      <DashboardContent />
    </CustomerFontProvider>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: signalGlass.colors.bgDeep,
  },
  body: {
    flex: 1,
    padding: signalGlass.spacing.marginMobile,
  },
  scroll: {
    paddingHorizontal: signalGlass.spacing.marginMobile,
    paddingTop: signalGlass.spacing.md,
    paddingBottom: signalGlass.spacing.xxxl,
  },
  heroRow: {
    gap: signalGlass.spacing.gutter,
  },
  gaugeCol: {},
  planCol: {},
});
