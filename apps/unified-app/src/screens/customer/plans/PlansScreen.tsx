import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import BottomSheet from '@gorhom/bottom-sheet';
import type { Plan, PaymentGateway, BillingCycle } from '@prime/types';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { PaymentCheckoutWebView } from '@/components/PaymentCheckoutWebView';
import { CustomerButton } from '@/components/customer/ui';
import { EmptyState, ErrorState } from '@/components/common';
import { CustomerSkeletonLoader } from '@/components/customer/ui';
import { signalGlass } from '@/theme/customer/signalGlass';
import type { CustomerStackParamList } from '@/types/navigation';
import { formatCurrencyInr } from '@/utils/formatCurrency';

import { PlanCard } from './components/PlanCard';
import { PlanDetailSheet } from './components/PlanDetailSheet';
import { PlanFilterChips } from './components/PlanFilterChips';
import { SortBottomSheet } from './components/SortBottomSheet';
import { usePlans } from './hooks/usePlans';

const CYCLES: BillingCycle[] = ['monthly', 'quarterly', 'annual'];

export function PlansScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CustomerStackParamList>>();
  const {
    plans,
    allCategories,
    category,
    setCategory,
    sortBy,
    setSortBy,
    search,
    setSearch,
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
  } = usePlans();

  const sortSheetRef = useRef<BottomSheet>(null);
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

  const onPlanChange = () => {
    if (!selectedPlan) return;
    detailSheetRef.current?.close();
    navigation.navigate('PlanChangeRequest', { planId: selectedPlan.id });
  };

  const renderItem = useCallback(
    ({ item }: { item: Plan }) => (
      <PlanCard
        plan={item}
        priceLabel={formatCurrencyInr(getPriceForCycle(item))}
        isCurrentPlan={item.id === currentPlanId}
        isFeatured={item.isFeatured}
        onPress={openDetail}
      />
    ),
    [currentPlanId, getPriceForCycle, openDetail],
  );

  if (error) {
    return (
      <View style={styles.canvas}>
        <ErrorState message="Failed to load plans" onRetry={refetch} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.canvas}>
        <CustomerSkeletonLoader rows={6} rowHeight={120} />
      </View>
    );
  }

  return (
    <View style={styles.canvas}>
      <Text style={styles.heading}>Browse Plans</Text>
      <View style={styles.cycleRow}>
        {CYCLES.map((cycle) => (
          <Pressable
            key={cycle}
            onPress={() => setBillingCycle(cycle)}
            style={[styles.cycleChip, billingCycle === cycle && styles.cycleChipActive]}
          >
            <Text style={[styles.cycleText, billingCycle === cycle && styles.cycleTextActive]}>
              {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.gatewayNote}>Payments via {paymentGateway}</Text>
      <TextInput
        style={styles.search}
        placeholder="Search plans…"
        placeholderTextColor={signalGlass.colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />
      <PlanFilterChips categories={allCategories} selected={category} onSelect={setCategory} />
      <Pressable style={styles.sortButton} onPress={() => sortSheetRef.current?.expand()}>
        <Text style={styles.sortText}>Sort: {sortBy}</Text>
      </Pressable>
      <FlashList
        data={plans}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState title="No plans match filters" subtitle="Try another category or search" />
        }
        renderItem={renderItem}
      />
      <SortBottomSheet ref={sortSheetRef} sortBy={sortBy} onSelect={setSortBy} />
      <PlanDetailSheet
        ref={detailSheetRef}
        plan={selectedPlan}
        price={selectedPlan ? getPriceForCycle(selectedPlan) : 0}
        billingCycle={billingCycle}
        isCurrentPlan={selectedPlan?.id === currentPlanId}
        subscribing={subscribing}
        onSubscribe={onSubscribe}
        onPlanChange={onPlanChange}
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
  canvas: { flex: 1, backgroundColor: signalGlass.colors.bgDeep, padding: signalGlass.spacing.lg },
  heading: {
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.display,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: signalGlass.spacing.md,
  },
  cycleRow: { flexDirection: 'row', gap: signalGlass.spacing.xs, marginBottom: signalGlass.spacing.sm },
  cycleChip: {
    flex: 1,
    borderRadius: signalGlass.radius.sm,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
    paddingVertical: signalGlass.spacing.sm,
    alignItems: 'center',
  },
  cycleChipActive: {
    borderColor: signalGlass.colors.accentPrimary,
    backgroundColor: 'rgba(59,130,246,0.15)',
  },
  cycleText: { color: signalGlass.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  cycleTextActive: { color: signalGlass.colors.accentGlow },
  gatewayNote: { color: signalGlass.colors.textMuted, fontSize: 12, marginBottom: signalGlass.spacing.sm },
  search: {
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
    borderRadius: signalGlass.radius.sm,
    padding: signalGlass.spacing.md,
    backgroundColor: signalGlass.colors.bgSurface,
    color: signalGlass.colors.textPrimary,
    marginBottom: signalGlass.spacing.xs,
  },
  sortButton: { alignSelf: 'flex-end', marginBottom: signalGlass.spacing.xs },
  sortText: { color: signalGlass.colors.accentGlow, fontWeight: '600' },
  list: { paddingBottom: signalGlass.spacing.xxxl },
});
