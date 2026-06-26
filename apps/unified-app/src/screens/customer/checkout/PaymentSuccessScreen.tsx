import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Linking, StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomerButton, PaymentSuccessCheckmark } from '@/components/customer/ui';
import { useCustomerTheme } from '@/components/customer/CustomerThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useLazyGetInvoiceUrlQuery } from '@/services/api';
import type { CustomerStackParamList } from '@/types/navigation';
import type { CustomerTheme } from '@/theme/customer';
import { formatCurrencyInr } from '@/utils/formatCurrency';

type Props = NativeStackScreenProps<CustomerStackParamList, 'PaymentSuccess'>;

export function PaymentSuccessScreen({ navigation, route }: Props) {
  const { amount, planName, activationDate, paymentId } = route.params;
  const insets = useSafeAreaInsets();
  const { theme } = useCustomerTheme();
  const styles = useThemedStyles(createStyles);
  const [fetchInvoice, { isFetching }] = useLazyGetInvoiceUrlQuery();

  const onDownloadInvoice = async () => {
    try {
      const url = await fetchInvoice(paymentId).unwrap();
      if (!url) return;
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(url);
      } else {
        await Linking.openURL(url);
      }
    } catch {
      // User can retry
    }
  };

  const onBackToHome = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'CustomerTabs', params: { screen: 'Home' } }],
      }),
    );
  };

  const activationLabel = new Date(activationDate).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={[styles.screen, { paddingTop: insets.top + theme.spacing.lg }]}>
      <PaymentSuccessCheckmark />
      <Text style={styles.title}>{formatCurrencyInr(amount)} paid successfully</Text>
      <Text style={styles.subtitle}>Your plan is being activated</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Plan</Text>
          <Text style={styles.value}>{planName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Activation date</Text>
          <Text style={styles.value}>{activationLabel}</Text>
        </View>
      </View>

      <CustomerButton
        label={isFetching ? 'Preparing invoice…' : 'Download receipt'}
        onPress={() => void onDownloadInvoice()}
        style={styles.btn}
      />
      <CustomerButton label="Back to Home" variant="ghost" onPress={onBackToHome} />
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.bgDeep,
      padding: theme.spacing.xl,
      justifyContent: 'center',
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.display,
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
    },
    subtitle: {
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.xl,
    },
    card: {
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radius.md,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      marginBottom: theme.spacing.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm },
    label: { color: theme.colors.textSecondary, fontSize: 14, flexShrink: 0 },
    value: { color: theme.colors.textPrimary, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
    btn: { marginBottom: theme.spacing.sm },
  });
