import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BillingCycle } from '@prime/types';

import { CustomerTopBar } from '@/components/customer/shell';
import {
  CustomerButton,
  CustomerErrorState,
  CustomerSkeletonLoader,
  CustomerStatusPill,
  GlassCard,
} from '@/components/customer/ui';
import { useCustomerIdentity } from '@/hooks/useCustomerIdentity';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { getPriceForCycle } from '@/services/api/customerDashboardApi';
import {
  useGetActivePaymentGatewayQuery,
  useGetActiveSubscriptionQuery,
  useGetPlanByIdQuery,
} from '@/services/api';
import { usePlanChangeRequest } from '@/hooks/usePlanChangeRequest';
import type { CustomerTheme } from '@/theme/customer';
import type { CustomerStackParamList } from '@/types/navigation';
import { formatCurrencyInr } from '@/utils/formatCurrency';
import { formatDateIst } from '@/utils/formatDate';
import {
  getPlanChangeDirection,
  planChangeActionLabel,
  type PlanChangeDirection,
} from '@/utils/planChange';
import { getPlanTierLabel } from '@/utils/planDisplay';
import { queryErrorMessage } from '@/utils/queryError';

import { PlanChangeConfirmSheet } from './components/PlanChangeConfirmSheet';
import { PlanFeatureList } from './components/PlanFeatureList';

type Props = NativeStackScreenProps<CustomerStackParamList, 'PlanDetails'>;

const CYCLES: BillingCycle[] = ['monthly', 'quarterly', 'annual'];

export function PlanDetailsScreen({ navigation, route }: Props) {
  const { planId } = route.params;
  const styles = useThemedStyles(createStyles);
  const { userId } = useCustomerIdentity();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [confirmVisible, setConfirmVisible] = useState(false);

  const { data: plan, isLoading, error, refetch } = useGetPlanByIdQuery(planId);
  const { data: subscription } = useGetActiveSubscriptionQuery(userId, { skip: !userId });
  const { data: currentPlan } = useGetPlanByIdQuery(subscription?.planId ?? '', {
    skip: !subscription?.planId,
  });
  const { data: activeGateway } = useGetActivePaymentGatewayQuery();
  const { submitRequest, isSubmitting } = usePlanChangeRequest();

  const isCurrentPlan = subscription?.planId === planId;
  const changeDirection: PlanChangeDirection = plan
    ? getPlanChangeDirection(currentPlan, plan)
    : 'switch';
  const price = plan ? getPriceForCycle(plan, billingCycle) : 0;
  const tierLabel = plan ? getPlanTierLabel(plan.speedMbps, plan.isFeatured) : '';
  const gatewayLabel = activeGateway?.display_name ?? 'Easebuzz';

  const renewalProgress = useMemo(() => {
    if (!subscription?.daysUntilExpiry || !plan) return 0;
    const totalDays = plan.validityDays > 0 ? plan.validityDays : 30;
    const elapsed = totalDays - subscription.daysUntilExpiry;
    return Math.min(Math.max(elapsed / totalDays, 0), 1);
  }, [plan, subscription?.daysUntilExpiry]);

  const submitPlanChange = async () => {
    if (!plan) return;
    try {
      await submitRequest({
        currentPlanId: subscription?.planId ?? null,
        requestedPlanId: plan.id,
        requestedCycle: billingCycle,
      }).unwrap();
      setConfirmVisible(false);
      Alert.alert(
        'Request submitted!',
        'Our team will process it within 24 hours.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      Alert.alert('Could not submit request', queryErrorMessage(e, 'Try again in a moment.'));
    }
  };

  if (isLoading) {
    return (
      <View style={styles.canvas}>
        <CustomerTopBar onNotificationsPress={() => navigation.navigate('Notifications')} />
        <CustomerSkeletonLoader rows={5} rowHeight={72} />
      </View>
    );
  }

  if (error || !plan) {
    return (
      <View style={styles.canvas}>
        <CustomerTopBar onNotificationsPress={() => navigation.navigate('Notifications')} />
        <CustomerErrorState message="Plan not found" onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={styles.canvas}>
      <CustomerTopBar onNotificationsPress={() => navigation.navigate('Notifications')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isCurrentPlan ? (
          <CustomerStatusPill label="Current plan" tone="current" style={styles.currentPill} />
        ) : null}

        <GlassCard style={styles.heroCard} glow={isCurrentPlan} padded>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.speedLine}>
            {plan.speedMbps} Mbps · {tierLabel}
          </Text>
          <Text style={styles.price}>{formatCurrencyInr(price)}</Text>
          <Text style={styles.cycleLabel}>{billingCycle} billing</Text>
        </GlassCard>

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

        {!isCurrentPlan && currentPlan && plan ? (
          <GlassCard style={styles.section} padded>
            <Text style={styles.sectionTitle}>Plan comparison</Text>
            <View style={styles.compareHeader}>
              <Text style={styles.compareColTitle}>Current</Text>
              <Text style={styles.compareArrow}>→</Text>
              <Text style={styles.compareColTitle}>Selected</Text>
            </View>
            <View style={styles.compareRow}>
              <Text style={styles.compareLabel}>{currentPlan.name}</Text>
              <Text style={styles.compareSpacer} />
              <Text style={styles.compareValue}>{plan.name}</Text>
            </View>
            <View style={styles.compareRow}>
              <Text style={styles.compareMuted}>{currentPlan.speedMbps} Mbps</Text>
              <Text style={styles.compareSpacer} />
              <Text style={styles.compareValue}>{plan.speedMbps} Mbps</Text>
            </View>
            <View style={styles.compareRow}>
              <Text style={styles.compareMuted}>
                {formatCurrencyInr(getPriceForCycle(currentPlan, billingCycle))}/mo
              </Text>
              <Text style={styles.compareSpacer} />
              <Text style={styles.compareValue}>
                {formatCurrencyInr(getPriceForCycle(plan, billingCycle))}/mo
              </Text>
            </View>
            <View style={styles.compareRow}>
              <Text style={styles.compareMuted}>
                {currentPlan.isUnlimited ? 'Unlimited data' : `${currentPlan.dataLimitGb ?? '—'} GB`}
              </Text>
              <Text style={styles.compareSpacer} />
              <Text style={styles.compareValue}>
                {plan.isUnlimited ? 'Unlimited data' : `${plan.dataLimitGb ?? '—'} GB`}
              </Text>
            </View>
          </GlassCard>
        ) : null}

        {isCurrentPlan && subscription ? (
          <GlassCard style={styles.section} padded>
            <Text style={styles.sectionTitle}>Renewal</Text>
            <Text style={styles.renewalDate}>
              Next renewal: {formatDateIst(subscription.endAt)}
            </Text>
            <Text style={styles.renewalDays}>{subscription.daysUntilExpiry} days remaining</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(renewalProgress * 100)}%` }]} />
            </View>
          </GlassCard>
        ) : null}

        <GlassCard style={styles.section} padded>
          <Text style={styles.sectionTitle}>What's included</Text>
          <PlanFeatureList plan={plan} />
        </GlassCard>

        <Text style={styles.gatewayNote}>
          {activeGateway?.slug === 'razorpay' ? 'Secured by Razorpay' : `Payments via ${gatewayLabel}`}
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        {isCurrentPlan ? (
          <CustomerButton label="Back to plans" variant="outline" onPress={() => navigation.goBack()} />
        ) : subscription ? (
          <CustomerButton
            label={planChangeActionLabel(changeDirection, plan.speedMbps)}
            icon={
              changeDirection === 'downgrade'
                ? 'arrow-down-bold'
                : changeDirection === 'switch'
                  ? 'swap-horizontal'
                  : 'arrow-up-bold'
            }
            variant={changeDirection === 'downgrade' ? 'outline' : 'primary'}
            onPress={() => setConfirmVisible(true)}
          />
        ) : (
          <CustomerButton
            label="Select this plan"
            onPress={() => navigation.navigate('Checkout', { planId: plan.id, amount: price })}
          />
        )}
      </View>

      <PlanChangeConfirmSheet
        visible={confirmVisible}
        currentPlanName={subscription?.planName ?? 'your current plan'}
        requestedPlanName={plan.name}
        changeDirection={changeDirection}
        loading={isSubmitting}
        onConfirm={() => void submitPlanChange()}
        onCancel={() => setConfirmVisible(false)}
      />
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    canvas: { flex: 1, backgroundColor: theme.colors.bgDeep },
    content: {
      paddingHorizontal: theme.spacing.marginMobile,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xxxl,
      gap: theme.spacing.md,
    },
    currentPill: {
      alignSelf: 'flex-start',
    },
    heroCard: {
      borderRadius: theme.radius.lg,
      gap: theme.spacing.xs,
    },
    planName: {
      ...theme.typography.displayLg,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.display,
    },
    speedLine: {
      ...theme.typography.bodyLg,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
    },
    price: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.colors.primary,
      fontFamily: theme.fonts.monoBold,
      marginTop: theme.spacing.sm,
    },
    cycleLabel: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.body,
      textTransform: 'capitalize',
    },
    cycleToggle: {
      flexDirection: 'row',
      backgroundColor: theme.colors.bgGlass,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: 4,
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
    section: {
      borderRadius: theme.radius.lg,
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      ...theme.typography.bodyLg,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
      marginBottom: theme.spacing.xs,
    },
    renewalDate: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
    },
    renewalDays: {
      ...theme.typography.monoMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.mono,
    },
    progressTrack: {
      height: 8,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceContainerHigh,
      overflow: 'hidden',
      marginTop: theme.spacing.xs,
    },
    progressFill: {
      height: '100%',
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.primary,
    },
    dataRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    feature: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      flex: 1,
    },
    compareHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.xs,
    },
    compareColTitle: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.bodySemiBold,
      flex: 1,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    compareArrow: {
      color: theme.colors.primary,
      fontFamily: theme.fonts.bodySemiBold,
      paddingHorizontal: theme.spacing.sm,
    },
    compareRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.xs,
    },
    compareLabel: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.body,
      flex: 1,
    },
    compareMuted: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      flex: 1,
    },
    compareSpacer: {
      width: 24,
    },
    compareValue: {
      ...theme.typography.bodyMedium,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
      flex: 1,
      textAlign: 'right',
    },
    gatewayNote: {
      textAlign: 'center',
      color: theme.colors.textMuted,
      fontSize: 12,
      fontFamily: theme.fonts.body,
    },
    footer: {
      paddingHorizontal: theme.spacing.marginMobile,
      paddingVertical: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderSubtle,
      backgroundColor: theme.colors.bgDeep,
    },
  });
