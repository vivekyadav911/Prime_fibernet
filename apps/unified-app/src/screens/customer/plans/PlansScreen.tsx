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
import { signalGlass } from '@/theme/customer/signalGlass';
import type { CustomerStackParamList } from '@/types/navigation';
import { formatCurrencyInr } from '@/utils/formatCurrency';

import { PlanCard } from './components/PlanCard';
import { PlanDetailSheet } from './components/PlanDetailSheet';
import { usePlans } from './hooks/usePlans';

const CYCLES: BillingCycle[] = ['monthly', 'quarterly', 'annual'];

export function PlansScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
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

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: signalGlass.colors.bgDeep },
  list: {
    paddingHorizontal: signalGlass.spacing.marginMobile,
    paddingBottom: signalGlass.spacing.xxxl,
  },
  headerBlock: {
    paddingTop: signalGlass.spacing.md,
    paddingBottom: signalGlass.spacing.lg,
  },
  heading: {
    ...signalGlass.typography.displayLg,
    color: signalGlass.colors.onSurface,
    fontFamily: signalGlass.fonts.display,
    marginBottom: signalGlass.spacing.sm,
  },
  subheading: {
    ...signalGlass.typography.body,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.body,
    marginBottom: signalGlass.spacing.lg,
  },
  cycleToggle: {
    flexDirection: 'row',
    backgroundColor: signalGlass.colors.bgGlass,
    borderRadius: signalGlass.radius.pill,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderGlass,
    padding: 4,
    marginBottom: signalGlass.spacing.sm,
  },
  cycleBtn: {
    flex: 1,
    paddingVertical: signalGlass.spacing.xs,
    borderRadius: signalGlass.radius.pill,
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  cycleBtnActive: {
    backgroundColor: signalGlass.colors.accentPrimaryMuted,
    borderWidth: 1,
    borderColor: 'rgba(173,198,255,0.3)',
  },
  cycleText: {
    ...signalGlass.typography.caption,
    color: signalGlass.colors.onSurfaceVariant,
    fontFamily: signalGlass.fonts.bodyMedium,
  },
  cycleTextActive: {
    color: signalGlass.colors.primary,
  },
  gatewayNote: {
    color: signalGlass.colors.textMuted,
    fontSize: 12,
    fontFamily: signalGlass.fonts.body,
  },
});
