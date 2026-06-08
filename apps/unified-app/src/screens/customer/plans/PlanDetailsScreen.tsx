import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Screen, colors } from '@prime/ui';

import { ErrorState, SkeletonLoader } from '@/components/common';
import { useGetActiveSubscriptionQuery, useGetPlanByIdQuery } from '@/services/api';
import { useAppSelector } from '@/store/hooks';
import type { CustomerStackParamList } from '@/types/navigation';
import { spacing } from '@/theme/spacing';

type Props = NativeStackScreenProps<CustomerStackParamList, 'PlanDetails'>;

const OTT_KEYWORDS = ['ott', 'netflix', 'hotstar', 'prime video', 'zee', 'sony'];

function partitionFeatures(features: string[]) {
  const ottAddons: string[] = [];
  const coreFeatures: string[] = [];
  features.forEach((feature) => {
    const lower = feature.toLowerCase();
    if (OTT_KEYWORDS.some((k) => lower.includes(k))) {
      ottAddons.push(feature);
    } else {
      coreFeatures.push(feature);
    }
  });
  return { ottAddons, coreFeatures };
}

export function PlanDetailsScreen({ navigation, route }: Props) {
  const { planId } = route.params;
  const user = useAppSelector((s) => s.auth.user);
  const { data: plan, isLoading, error, refetch } = useGetPlanByIdQuery(planId);
  const { data: subscription } = useGetActiveSubscriptionQuery(user?.id ?? '', {
    skip: !user?.id,
  });

  const isCurrentPlan = subscription?.planId === planId;

  if (isLoading) {
    return (
      <Screen>
        <SkeletonLoader rows={5} rowHeight={64} shape="card" />
      </Screen>
    );
  }

  if (error || !plan) {
    return (
      <Screen>
        <ErrorState message="Plan not found" onRetry={refetch} />
      </Screen>
    );
  }

  const { ottAddons, coreFeatures } = partitionFeatures(plan.features);
  const amount = plan.price;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        {isCurrentPlan ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Your Plan</Text>
          </View>
        ) : null}

        <View style={styles.hero}>
          <Text style={styles.name}>{plan.name}</Text>
          <Text style={styles.speed}>{plan.speedMbps} Mbps</Text>
          <Text style={styles.meta}>{plan.validityDays} days validity</Text>
          <Text style={styles.price}>₹{plan.price.toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          {coreFeatures.map((feature) => (
            <Text key={feature} style={styles.feature}>
              ✓ {feature}
            </Text>
          ))}
        </View>

        {ottAddons.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>OTT add-ons</Text>
            {ottAddons.map((addon) => (
              <Text key={addon} style={styles.feature}>
                📺 {addon}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment breakdown</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Plan price</Text>
            <Text style={styles.value}>₹{amount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Validity</Text>
            <Text style={styles.value}>{plan.validityDays} days</Text>
          </View>
        </View>
      </ScrollView>

      {!isCurrentPlan ? (
        <View style={styles.footer}>
          <Button
            label="Subscribe"
            onPress={() => navigation.navigate('Checkout', { planId, amount })}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.successGreen,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
  },
  badgeText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  hero: { gap: spacing.xs },
  name: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  speed: { fontSize: 20, fontWeight: '600', color: colors.primaryNavy },
  meta: { color: colors.textSecondary },
  price: { fontSize: 28, fontWeight: '700', color: colors.accentTeal, marginTop: spacing.sm },
  section: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  feature: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xxs },
  label: { color: colors.textSecondary },
  value: { fontWeight: '600', color: colors.textPrimary },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.surfaceWhite,
  },
});
