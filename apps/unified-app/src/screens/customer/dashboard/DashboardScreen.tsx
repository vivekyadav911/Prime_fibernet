import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Screen } from '@prime/ui';

import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import type { CustomerTabParamList } from '@/types/navigation';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { ActivePlanCard } from './components/ActivePlanCard';
import { PaymentDueBanner } from './components/PaymentDueBanner';
import { QuickActionsRow } from './components/QuickActionsRow';
import { RecentRequestsList } from './components/RecentRequestsList';
import { WelcomeHeader } from './components/WelcomeHeader';
import { useDashboard } from './hooks/useDashboard';

export function DashboardScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<CustomerTabParamList>>();
  const {
    user,
    profile,
    subscription,
    recentRequests,
    showPaymentBanner,
    isLoading,
    error,
    refetch,
  } = useDashboard();

  if (isLoading && !subscription) {
    return (
      <Screen>
        <SkeletonLoader rows={4} rowHeight={72} shape="card" />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState message="Could not load your dashboard" onRetry={refetch} />
      </Screen>
    );
  }

  const displayName = profile?.name ?? user?.name ?? 'Customer';

  const quickActions = [
    {
      id: 'renew',
      label: 'Renew',
      icon: '🔄',
      tint: colors.accentTeal,
      onPress: () => navigation.navigate('Plans'),
    },
    {
      id: 'request',
      label: 'Raise request',
      icon: '📋',
      tint: colors.warningAmber,
      onPress: () => navigation.navigate('Requests'),
    },
    {
      id: 'pay',
      label: 'Pay bill',
      icon: '💳',
      tint: colors.primaryNavy,
      onPress: () => navigation.navigate('Payments'),
    },
    {
      id: 'support',
      label: 'Support',
      icon: '💬',
      tint: colors.successGreen,
      onPress: () => navigation.navigate('Support'),
    },
  ];

  return (
    <Screen padded={false} style={styles.screen}>
      {showPaymentBanner && subscription?.daysUntilExpiry != null ? (
        <PaymentDueBanner
          daysUntilExpiry={subscription.daysUntilExpiry}
          onPress={() => navigation.navigate('Payments')}
        />
      ) : null}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <WelcomeHeader name={displayName} />

        {subscription ? (
          <ActivePlanCard
            subscription={subscription}
            onChangePlan={() => navigation.navigate('Plans')}
          />
        ) : (
          <EmptyState
            title="No active plan"
            subtitle="Browse plans to get connected"
            actionLabel="Browse plans"
            onAction={() => navigation.navigate('Plans')}
            icon="📶"
          />
        )}

        <QuickActionsRow actions={quickActions} />

        <RecentRequestsList
          requests={recentRequests}
          onViewAll={() => navigation.navigate('Requests')}
          onPressRequest={() => navigation.navigate('Requests')}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.lg },
});

/** @deprecated Use DashboardScreen — kept for navigator import compatibility */
export const CustomerDashboardScreen = DashboardScreen;
