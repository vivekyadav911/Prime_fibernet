import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import BottomSheet from '@gorhom/bottom-sheet';
import type { Plan, PaymentGateway, BillingCycle } from '@prime/types';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { PaymentCheckoutWebView } from '@/components/PaymentCheckoutWebView';
import { CustomerTopBar } from '@/components/customer/shell';
import { CustomerEmptyState, CustomerErrorState, CustomerSkeletonLoader } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';
import type { CustomerStackParamList } from '@/types/navigation';
import { formatCurrencyInr } from '@/utils/formatCurrency';

import { PlanCard } from './components/PlanCard';
import { PlanDetailSheet } from './components/PlanDetailSheet';
import { usePlans } from './hooks/usePlans';

const CYCLES: BillingCycle[] = ['monthly', 'quarterly', 'annual'];

export function PlansScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  const styles = useThemedStyles(createStyles);
  const {
    plans,
    billingCycle,
    setBillingCycle,
    getPriceForCycle,
    currentPlanId,
    paymentGateway,
    isLoading,
    error,
    refetch,
    subscribeToPlan,
    verifyPayment,
    subscription,
  } = usePlans();

  const detailSheetRef = useRef<BottomSheet>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [checkout, setCheckout] = useState<{
    url: string | null;
    paymentId: string;
    orderId: string;
    gateway: PaymentGateway;
  } | null>(null);

  const openDetail = useCallback((plan: Plan) => {
    setSelectedPlan(plan);
    detailSheetRef.current?.expand();
  }, []);

  const onSubscribe = async () => {
    if (!selectedPlan) return;
    setSubscribing(true);
    try {
      const result = await subscribeToPlan(selectedPlan);
      detailSheetRef.current?.close();
      setCheckout({
        url: result.checkoutUrl,
        paymentId: result.paymentId,
        orderId: result.orderId,
        gateway: result.gateway,
      });
    } finally {
      setSubscribing(false);
    }
  };

  const onPlanChange = (plan: Plan) => {
    navigation.navigate('PlanChangeRequest', { planId: plan.id });
  };

  const renderItem = useCallback(
    ({ item }: { item: Plan }) => (
      <PlanCard
        plan={item}
        priceLabel={formatCurrencyInr(getPriceForCycle(item))}
        isCurrentPlan={item.id === currentPlanId}
        daysUntilRenewal={subscription?.daysUntilExpiry}
        onPress={openDetail}
        onChangePlan={onPlanChange}
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
        <CustomerSkeletonLoader rows={3} rowHeight={220} />
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
            <Text style={styles.heading}>Select Your Plan</Text>
            <Text style={styles.subheading}>
              Upgrade your connection to match your digital lifestyle. Choose a plan that fits your speed and budget.
            </Text>
            <View style={styles.cycleToggle}>
              {CYCLES.map((cycle) => {
                const active = billingCycle === cycle;
                return (
                  <Pressable
                    key={cycle}
                    onPress={() => setBillingCycle(cycle)}
                    style={[styles.cycleBtn, active && styles.cycleBtnActive]}
                    accessibilityLabel={`${cycle} billing`}
                  >
                    <Text style={[styles.cycleText, active && styles.cycleTextActive]}>
                      {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.gatewayNote}>Payments via {paymentGateway}</Text>
          </View>
        }
        ListEmptyComponent={
          <CustomerEmptyState title="No plans available" subtitle="Check back soon for new plans" />
        }
        renderItem={renderItem}
      />
      <PlanDetailSheet
        ref={detailSheetRef}
        plan={selectedPlan}
        price={selectedPlan ? getPriceForCycle(selectedPlan) : 0}
        billingCycle={billingCycle}
        isCurrentPlan={selectedPlan?.id === currentPlanId}
        subscribing={subscribing}
        onSubscribe={onSubscribe}
        onPlanChange={() => selectedPlan && onPlanChange(selectedPlan)}
      />
      <PaymentCheckoutWebView
        visible={!!checkout}
        checkoutUrl={checkout?.url ?? null}
        paymentId={checkout?.paymentId ?? ''}
        orderId={checkout?.orderId ?? ''}
        gateway={checkout?.gateway ?? 'easybuzz'}
        onClose={() => setCheckout(null)}
        onSuccess={() => refetch()}
        onVerify={(p) => verifyPayment(p).unwrap().then(() => undefined)}
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
      paddingBottom: theme.spacing.lg,
    },
    heading: {
      ...theme.typography.displayLg,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.display,
      marginBottom: theme.spacing.sm,
    },
    subheading: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      marginBottom: theme.spacing.lg,
    },
    cycleToggle: {
      flexDirection: 'row',
      backgroundColor: theme.colors.bgGlass,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: 4,
      marginBottom: theme.spacing.sm,
    },
    cycleBtn: {
      flex: 1,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.pill,
      alignItems: 'center',
      minHeight: 36,
      justifyContent: 'center',
    },
    cycleBtnActive: {
      backgroundColor: theme.colors.accentPrimaryMuted,
      borderWidth: 1,
      borderColor: 'rgba(173,198,255,0.3)',
    },
    cycleText: {
      ...theme.typography.caption,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.bodyMedium,
    },
    cycleTextActive: {
      color: theme.colors.primary,
    },
    gatewayNote: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontFamily: theme.fonts.body,
    },
  });
