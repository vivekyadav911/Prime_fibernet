import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerButton, CustomerInput } from '@/components/customer/ui';
import { CustomerFontProvider } from '@/components/customer/CustomerFontProvider';
import { useCustomerIdentity } from '@/hooks/useCustomerIdentity';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useGetActiveSubscriptionQuery, useGetPlanByIdQuery } from '@/services/api';
import { usePlanChangeRequest } from '@/hooks/usePlanChangeRequest';
import { queryErrorMessage } from '@/utils/queryError';
import type { CustomerTheme } from '@/theme/customer';
import type { CustomerStackParamList } from '@/types/navigation';

import { PlanChangeConfirmSheet } from './components/PlanChangeConfirmSheet';

type Props = NativeStackScreenProps<CustomerStackParamList, 'PlanChangeRequest'>;

function PlanChangeContent({ route, navigation }: Props) {
  const styles = useThemedStyles(createStyles);
  const { userId } = useCustomerIdentity();
  const { planId } = route.params;
  const { data: plan } = useGetPlanByIdQuery(planId);
  const { data: subscription } = useGetActiveSubscriptionQuery(userId, { skip: !userId });
  const [reason, setReason] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const { submitRequest, isSubmitting } = usePlanChangeRequest();

  const currentName = subscription?.planName ?? 'None';
  const requestedName = plan?.name ?? planId;

  const onSubmit = async () => {
    try {
      await submitRequest({
        currentPlanId: subscription?.planId ?? null,
        requestedPlanId: planId,
        requestedCycle: 'monthly',
        reason: reason.trim() || undefined,
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

  return (
    <>
      <ScrollView style={styles.canvas} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Request plan change</Text>
        <Text style={styles.sub}>
          Current: {currentName} → Requested: {requestedName}
        </Text>
        <CustomerInput
          label="Reason (optional)"
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={4}
          style={styles.textarea}
        />
        <CustomerButton
          label="Review request"
          onPress={() => setConfirmVisible(true)}
          disabled={isSubmitting}
        />
      </ScrollView>

      <PlanChangeConfirmSheet
        visible={confirmVisible}
        currentPlanName={currentName}
        requestedPlanName={requestedName}
        loading={isSubmitting}
        onConfirm={() => void onSubmit()}
        onCancel={() => setConfirmVisible(false)}
      />
    </>
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
    content: { padding: theme.spacing.lg, gap: theme.spacing.md, paddingBottom: theme.spacing.xxxl },
    heading: {
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.display,
      fontSize: 22,
      fontWeight: '700',
    },
    sub: { color: theme.colors.textSecondary, fontSize: 14 },
    textarea: { minHeight: 100, textAlignVertical: 'top' },
  });
