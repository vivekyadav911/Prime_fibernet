import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Share, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';

import { PaymentSuccessCheckmark } from '@/components/customer/ui';
import { CustomerButton } from '@/components/customer/ui';
import { GstInvoiceRequestSheet, type GstInvoiceFormValues, type GstInvoiceSubmittedState } from '@/components/customer/payments/GstInvoiceRequestSheet';
import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import {
  useCreateGstInvoiceRequestMutation,
  useLazyGetPaymentReceiptQuery,
} from '@/services/api/paymentCollectionApi';
import { useVerifyPaymentMutation } from '@/services/api';
import { useAppDispatch } from '@/store/hooks';
import { getPaymentProvider, resolvePaymentProviderSlug } from '@/services/payment/PaymentProvider';
import type { CustomerStackParamList } from '@/types/navigation';
import type { CustomerTheme } from '@/theme/customer';
import { formatINR } from '@/utils/currencyFormat';
import { gstInvoiceStatusMessage } from '@/utils/gstInvoiceMessages';
import { invalidatePaymentCaches } from '@/utils/invalidatePaymentCaches';

type Props = NativeStackScreenProps<CustomerStackParamList, 'PaymentResult'>;

type VerifyState = 'verifying' | 'success' | 'failed';

export function PaymentResultScreen({ navigation, route }: Props) {
  const {
    paymentId,
    amount,
    planName,
    orderId,
    gatewaySlug,
    razorpayPaymentId,
    razorpaySignature,
  } = route.params;
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { theme } = useCustomerTheme();
  const styles = useThemedStyles(createStyles);
  const [verifyState, setVerifyState] = useState<VerifyState>('verifying');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [gstSheetVisible, setGstSheetVisible] = useState(false);
  const [gstSubmitted, setGstSubmitted] = useState<GstInvoiceSubmittedState | null>(null);

  const [verifyPayment] = useVerifyPaymentMutation();
  const [createGstRequest, { isLoading: gstSubmitting }] = useCreateGstInvoiceRequestMutation();
  const [fetchReceipt, { isFetching: receiptLoading }] = useLazyGetPaymentReceiptQuery();

  const provider = getPaymentProvider(resolvePaymentProviderSlug(gatewaySlug));

  const runVerification = useCallback(async () => {
    setVerifyState('verifying');
    setVerifyError(null);

    const gateway =
      gatewaySlug === 'easebuzz' || gatewaySlug === 'razorpay'
        ? (gatewaySlug === 'easebuzz' ? 'easybuzz' : 'razorpay')
        : undefined;

    const maxAttempts = razorpayPaymentId && razorpaySignature ? 1 : 5;

    try {
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const result = await verifyPayment({
          paymentId,
          orderId,
          gateway,
          razorpayPaymentId,
          razorpaySignature,
          pollOnly: attempt > 0 || (!razorpayPaymentId && !razorpaySignature),
        }).unwrap();

        if (result.success) {
          invalidatePaymentCaches(dispatch);
          setVerifyState('success');
          return;
        }

        if (result.status !== 'pending' || attempt === maxAttempts - 1) {
          setVerifyState('failed');
          setVerifyError('Payment could not be confirmed. Contact support if money was debited.');
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    } catch (e) {
      setVerifyState('failed');
      setVerifyError(e instanceof Error ? e.message : 'Verification failed');
    }
  }, [
    dispatch,
    gatewaySlug,
    orderId,
    paymentId,
    razorpayPaymentId,
    razorpaySignature,
    verifyPayment,
  ]);

  useEffect(() => {
    void runVerification();
  }, [runVerification]);

  const onDownloadReceipt = async () => {
    try {
      const result = await fetchReceipt(paymentId).unwrap();
      if (result.url && (await Sharing.isAvailableAsync())) {
        await Share.share({ url: result.url, message: `Receipt ${result.receiptNumber}` });
      } else if (result.url) {
        await Linking.openURL(result.url);
      } else {
        navigation.navigate('Receipt', { paymentId });
      }
    } catch {
      navigation.navigate('Receipt', { paymentId });
    }
  };

  const onGstSubmit = async (values: GstInvoiceFormValues) => {
    try {
      const result = await createGstRequest({
        paymentId,
        gstin: values.gstin,
        businessName: values.businessName,
        billingAddress: values.billingAddress,
      }).unwrap();

      if (result.alreadyExists) {
        Alert.alert(
          'Request Already Submitted',
          gstInvoiceStatusMessage(result.status ?? 'pending'),
          [{ text: 'OK' }],
        );
        setGstSheetVisible(false);
        return;
      }

      setGstSubmitted({
        requestId: result.id,
        gstin: values.gstin.toUpperCase(),
        businessName: values.businessName,
      });
    } catch {
      Alert.alert('Submission Failed', 'Could not submit request. Please try again.');
    }
  };

  const onBackToPayments = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'CustomerTabs', params: { screen: 'Payments' } }],
      }),
    );
  };

  if (verifyState === 'verifying') {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + theme.spacing.xl }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.verifyingTitle}>Verifying payment…</Text>
        <Text style={styles.verifyingBody}>Please wait while we confirm your payment with {provider.displayName}.</Text>
      </View>
    );
  }

  if (verifyState === 'failed') {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + theme.spacing.xl, paddingHorizontal: theme.spacing.lg }]}>
        <Text style={styles.failIcon}>✕</Text>
        <Text style={styles.failTitle}>Payment not confirmed</Text>
        <Text style={styles.failBody}>{verifyError ?? 'Something went wrong. Please try again.'}</Text>
        <CustomerButton label="Try again" onPress={() => void runVerification()} style={styles.btn} />
        <CustomerButton label="Back to payments" variant="ghost" onPress={onBackToPayments} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + theme.spacing.lg, paddingHorizontal: theme.spacing.lg }]}>
      <PaymentSuccessCheckmark />
      <Text style={styles.title}>{formatINR(amount)} paid successfully</Text>
      <Text style={styles.subtitle}>Thank you! Your payment via {provider.displayName} is confirmed.</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Plan</Text>
          <Text style={styles.value}>{planName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Reference</Text>
          <Text style={styles.valueMono}>{paymentId.slice(0, 8).toUpperCase()}</Text>
        </View>
      </View>

      <CustomerButton
        label={receiptLoading ? 'Preparing receipt…' : 'Download receipt'}
        icon="file-download-outline"
        onPress={() => void onDownloadReceipt()}
        style={styles.btn}
      />
      <CustomerButton
        label="Request GST invoice"
        variant="outline"
        icon="file-document-outline"
        onPress={() => {
          setGstSubmitted(null);
          setGstSheetVisible(true);
        }}
        style={styles.btn}
      />
      <CustomerButton label="Back to payments" variant="ghost" onPress={onBackToPayments} />

      <GstInvoiceRequestSheet
        visible={gstSheetVisible}
        loading={gstSubmitting}
        submitted={gstSubmitted}
        onSubmit={(values) => void onGstSubmit(values)}
        onClose={() => {
          setGstSheetVisible(false);
          setGstSubmitted(null);
        }}
      />
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.bgDeep,
      alignItems: 'center',
    },
    verifyingTitle: {
      ...theme.typography.displayMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
      marginTop: theme.spacing.lg,
    },
    verifyingBody: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      textAlign: 'center',
      marginTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xl,
    },
    failIcon: {
      fontSize: 48,
      color: theme.colors.error,
      marginBottom: theme.spacing.md,
    },
    failTitle: {
      ...theme.typography.displayMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
      textAlign: 'center',
    },
    failBody: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      textAlign: 'center',
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    title: {
      ...theme.typography.displayLg,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
      textAlign: 'center',
      marginTop: theme.spacing.md,
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
      textAlign: 'center',
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.lg,
    },
    card: {
      width: '100%',
      backgroundColor: theme.colors.surfaceContainerLow,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      marginBottom: theme.spacing.lg,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: {
      ...theme.typography.caption,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.bodyMedium,
    },
    value: {
      ...theme.typography.body,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
    },
    valueMono: {
      ...theme.typography.monoMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.mono,
    },
    btn: {
      width: '100%',
      marginBottom: theme.spacing.sm,
    },
  });
