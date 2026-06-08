import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import type { Plan, PaymentGateway } from '@prime/types';
import { Screen } from '@prime/ui';

import { PaymentCheckoutWebView } from '@/components/PaymentCheckoutWebView';
import { EmptyState, ErrorState, SkeletonLoader } from '@/components/common';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

import { PlanCard } from './components/PlanCard';
import { PlanDetailSheet } from './components/PlanDetailSheet';
import { PlanFilterChips } from './components/PlanFilterChips';
import { SortBottomSheet } from './components/SortBottomSheet';
import { usePlans } from './hooks/usePlans';

export function PlansScreen() {
  const {
    plans,
    allCategories,
    category,
    setCategory,
    sortBy,
    setSortBy,
    search,
    setSearch,
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

  const renderItem = useCallback(
    ({ item }: { item: Plan }) => (
      <PlanCard
        plan={item}
        isCurrentPlan={item.id === currentPlanId}
        onPress={openDetail}
      />
    ),
    [currentPlanId, openDetail],
  );

  const keyExtractor = useCallback((item: Plan) => item.id, []);

  if (error) {
    return (
      <Screen>
        <ErrorState message="Failed to load plans" onRetry={refetch} />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={6} rowHeight={120} shape="card" />
      </Screen>
    );
  }

  if (!plans.length && !search && category === 'All') {
    return (
      <Screen>
        <EmptyState title="No plans available" subtitle="Check back soon for new offers" icon="📶" />
      </Screen>
    );
  }

  return (
    <Screen padded={false} style={styles.screen}>
      <Text style={styles.gatewayNote}>Payments via {paymentGateway}</Text>
      <TextInput
        style={styles.search}
        placeholder="Search plans…"
        placeholderTextColor={colors.textSecondary}
        value={search}
        onChangeText={setSearch}
      />
      <PlanFilterChips categories={allCategories} selected={category} onSelect={setCategory} />
      <Pressable style={styles.sortButton} onPress={() => sortSheetRef.current?.expand()}>
        <Text style={styles.sortText}>Sort: {sortBy}</Text>
      </Pressable>
      <FlatList
        data={plans}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={styles.column}
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
        isCurrentPlan={selectedPlan?.id === currentPlanId}
        subscribing={subscribing}
        onSubscribe={onSubscribe}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  gatewayNote: {
    padding: spacing.sm,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  search: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceWhite,
    color: colors.textPrimary,
  },
  sortButton: {
    alignSelf: 'flex-end',
    marginRight: spacing.md,
    marginBottom: spacing.xs,
  },
  sortText: { color: colors.accentTeal, fontWeight: '600' },
  list: { padding: spacing.md, gap: spacing.sm },
  column: { gap: spacing.sm, justifyContent: 'space-between' },
});
