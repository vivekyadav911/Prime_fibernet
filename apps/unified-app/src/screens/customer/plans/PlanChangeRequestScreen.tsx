import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BillingCycle } from '@prime/types';

import { CustomerButton, CustomerInput } from '@/components/customer/ui';
import { CustomerFontProvider } from '@/components/customer/CustomerFontProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useGetActiveSubscriptionQuery, useGetPlanByIdQuery } from '@/services/api';
import { usePlanChangeRequest } from '@/hooks/usePlanChangeRequest';
import { useAppSelector } from '@/store/hooks';
import type { CustomerStackParamList } from '@/types/navigation';
import type { CustomerTheme } from '@/theme/customer';

type Props = NativeStackScreenProps<CustomerStackParamList, 'PlanChangeRequest'>;

const CYCLES: BillingCycle[] = ['monthly', 'quarterly', 'annual'];

function PlanChangeContent({ route, navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const user = useAppSelector((s) => s.auth.user);
  const { planId } = route.params;
  const { data: plan } = useGetPlanByIdQuery(planId);
  const { data: subscription } = useGetActiveSubscriptionQuery(user?.id ?? '', { skip: !user?.id });
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [reason, setReason] = useState('');
  const { submitRequest, isSubmitting } = usePlanChangeRequest();

  const onSubmit = async () => {
    try {
      await submitRequest({
        currentPlanId: subscription?.planId ?? null,
        requestedPlanId: planId,
        requestedCycle: cycle,
        reason: reason.trim() || undefined,
      }).unwrap();
      Alert.alert(
        'Request submitted',
        'Our team will contact you within 24 hours.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not submit request');
    }
  };

  return (
    <ScrollView style={styles.canvas} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Request plan change</Text>
      <Text style={styles.sub}>
        Current: {subscription?.planName ?? 'None'} → Requested: {plan?.name ?? planId}
      </Text>
      <Text style={styles.label}>Billing cycle</Text>
      {CYCLES.map((c) => (
        <CustomerButton
          key={c}
          label={c.charAt(0).toUpperCase() + c.slice(1)}
          variant={cycle === c ? 'primary' : 'ghost'}
          onPress={() => setCycle(c)}
        />
      ))}
      <CustomerInput
        label="Reason (optional)"
        value={reason}
        onChangeText={setReason}
        multiline
        numberOfLines={4}
        style={styles.textarea}
      />
      <CustomerButton
        label={isSubmitting ? 'Submitting...' : 'Submit request'}
        onPress={() => void onSubmit()}
        disabled={isSubmitting}
      />
    </ScrollView>
  );
}

export function PlanChangeRequestScreen(props: Props) {
  return (
    <CustomerFontProvider>
      <PlanChangeContent {...props} />
    </CustomerFontProvider>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    canvas: { flex: 1, backgroundColor: theme.colors.bgDeep },
    content: { padding: theme.spacing.lg, gap: theme.spacing.md },
    heading: {
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.display,
      fontSize: 22,
      fontWeight: '700',
    },
    sub: { color: theme.colors.textSecondary, fontSize: 14 },
    label: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      marginTop: theme.spacing.sm,
    },
    textarea: { minHeight: 100, textAlignVertical: 'top' },
  });
