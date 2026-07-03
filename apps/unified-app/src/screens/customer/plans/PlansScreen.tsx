import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Plan } from '@prime/types';

import { CustomerTopBar } from '@/components/customer/shell';
import { CustomerEmptyState, CustomerErrorState, CustomerSkeletonLoader } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';
import type { CustomerStackParamList } from '@/types/navigation';
import { formatCurrencyInr } from '@/utils/formatCurrency';

import { PlanCard } from './components/PlanCard';
import { usePlans } from './hooks/usePlans';

const ESTIMATED_CARD_HEIGHT = 176;

export function PlansScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  const styles = useThemedStyles(createStyles);
  const {
    plans,
    getPriceForCycle,
    currentPlanId,
    paymentGateway,
    isLoading,
    error,
    refetch,
    subscription,
  } = usePlans();

  const openDetail = useCallback(
    (plan: Plan) => {
      navigation.navigate('PlanDetails', { planId: plan.id });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Plan }) => (
      <PlanCard
        plan={item}
        priceLabel={formatCurrencyInr(getPriceForCycle(item))}
        isCurrentPlan={item.id === currentPlanId}
        daysUntilRenewal={subscription?.daysUntilExpiry}
        onPress={openDetail}
      />
    ),
    [currentPlanId, getPriceForCycle, openDetail, subscription?.daysUntilExpiry],
  );

  if (error) {
    return (
      <View style={styles.canvas}>
        <CustomerTopBar onNotificationsPress={() => navigation.navigate('Notifications')} />
        <CustomerErrorState message="We couldn't load plans. Pull to refresh or try again." onRetry={refetch} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.canvas}>
        <CustomerTopBar onNotificationsPress={() => navigation.navigate('Notifications')} />
        <CustomerSkeletonLoader rows={4} rowHeight={ESTIMATED_CARD_HEIGHT} />
      </View>
    );
  }

  return (
    <View style={styles.canvas}>
      <CustomerTopBar onNotificationsPress={() => navigation.navigate('Notifications')} />
      <FlashList
        data={plans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={styles.heading}>Your Plans</Text>
            <Text style={styles.subheading}>
              Compare speeds and pricing. Tap a plan to see full details and request a change.
            </Text>
            <Text style={styles.gatewayNote}>Payments via {paymentGateway}</Text>
          </View>
        }
        ListEmptyComponent={
          <CustomerEmptyState title="No plans available" subtitle="Check back soon for new plans" />
        }
        renderItem={renderItem}
      />
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    canvas: { flex: 1, backgroundColor: theme.colors.bgDeep },
    list: {
      paddingHorizontal: theme.spacing.marginMobile,
      paddingBottom: theme.spacing.xxxl,
    },
    headerBlock: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    heading: {
      ...theme.typography.displayLg,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.display,
    },
    subheading: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
    },
    gatewayNote: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontFamily: theme.fonts.body,
      marginTop: theme.spacing.xs,
    },
  });
