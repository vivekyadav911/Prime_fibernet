import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  AnnouncementBanner,
  PlanCard,
  QuickActions,
  RecentActivity,
  SignalHero,
  type ActivityItem,
} from '@/components/customer/dashboard';
import { CustomerFontProvider } from '@/components/customer/CustomerFontProvider';
import { CustomerEmptyState, CustomerSkeletonLoader, CustomerToast, CustomerErrorState, FadeInSection } from '@/components/customer/ui';
import {
  useGetCustomerDashboardQuery,
  useGetCustomerProfileQuery,
  useGetPortalNotificationsQuery,
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
  const { data: notifications = [] } = useGetPortalNotificationsQuery({ limit: 20 });
  const toast = useCustomerUiStore((s) => s.toast);
  const clearToast = useCustomerUiStore((s) => s.clearToast);

  const connectionStatus = useMemo(() => {
    if (!data?.subscription) return 'expired' as const;
    if (data.subscription.isOverdue) return 'expired' as const;
    if (data.subscription.status === 'suspended') return 'suspended' as const;
    return 'active' as const;
  }, [data?.subscription]);

  const planStatus = useMemo(() => {
    if (!data?.subscription) return 'expired' as const;
    if (data.subscription.isOverdue) return 'overdue' as const;
    if (data.subscription.isExpiringSoon) return 'expiring' as const;
    if (data.subscription.status === 'expired') return 'expired' as const;
    return 'active' as const;
  }, [data?.subscription]);

  const activityItems: ActivityItem[] = useMemo(() => {
    const payments = (data?.recentPayments ?? []).map((p) => ({
      id: p.id,
      kind: 'payment' as const,
      title: 'Payment',
      date: p.createdAt,
      status: p.status,
      amount: p.amount,
    }));
    return payments.slice(0, 3);
  }, [data?.recentPayments]);

  if (isLoading && !data) {
    return (
      <View style={styles.canvas}>
        <CustomerSkeletonLoader rows={4} rowHeight={88} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.canvas}>
        <CustomerErrorState message="We couldn't load your dashboard. Check your connection and try again." onRetry={refetch} />
      </View>
    );
  }

  const sub = data?.subscription;
  const displayName = data?.profile.name ?? authUser?.name ?? 'Customer';
  const accountId = data?.profile.customerId ?? `ACC-${userId.slice(0, 8)}`;

  return (
    <View style={styles.canvas}>
      <CustomerToast
        title={toast?.title ?? ''}
        body={toast?.body}
        visible={Boolean(toast)}
        onDismiss={clearToast}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={signalGlass.colors.accentPrimary} />}
      >
        <FadeInSection delayMs={0}>
          <SignalHero
            speedMbps={sub?.speedMbps ?? 100}
            customerName={displayName}
            accountId={accountId}
            connectionStatus={connectionStatus}
            unreadCount={data?.unreadNotifications ?? 0}
            onNotificationsPress={() => navigation.navigate('Notifications')}
          />
        </FadeInSection>

        <FadeInSection delayMs={100}>
          <AnnouncementBanner items={notifications} />
        </FadeInSection>

        {sub ? (
          <FadeInSection delayMs={200}>
            <PlanCard
              planName={sub.planName}
              status={planStatus}
              renewalDate={sub.endAt}
              daysUntilExpiry={sub.daysUntilExpiry}
              dataLimitGb={sub.dataLimitGb}
              isUnlimited={sub.isUnlimited}
              onPayNow={() => navigation.navigate('Payments')}
              onUpgrade={() => navigation.navigate('Plans')}
            />
          </FadeInSection>
        ) : (
          <FadeInSection delayMs={200}>
            <CustomerEmptyState
              title="No active plan"
              subtitle="Browse plans to get connected"
              actionLabel="Browse Plans"
              onAction={() => navigation.navigate('Plans')}
              icon="◎"
            />
          </FadeInSection>
        )}

        <FadeInSection delayMs={300}>
          <QuickActions
            actions={[
              { id: 'pay', label: 'Pay Bill', icon: '💳', onPress: () => navigation.navigate('Payments') },
              { id: 'tickets', label: 'My Tickets', icon: '📋', onPress: () => navigation.navigate('CustomerTicketList') },
              { id: 'plan', label: 'Change Plan', icon: '🔄', onPress: () => navigation.navigate('Plans') },
              { id: 'support', label: 'Support', icon: '📞', onPress: () => navigation.navigate('Support') },
            ]}
          />
        </FadeInSection>

        <FadeInSection delayMs={400}>
          <RecentActivity
            items={activityItems}
            onViewAll={() => navigation.navigate('PaymentHistory')}
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
  scroll: {
    padding: signalGlass.spacing.lg,
    paddingBottom: signalGlass.spacing.xxxl,
  },
});
