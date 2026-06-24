import { useEffect, useRef } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Animated, Linking, StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { Button, Screen, colors } from '@prime/ui';
import { CommonActions } from '@react-navigation/native';

import { useLazyGetInvoiceUrlQuery } from '@/services/api';
import type { CustomerStackParamList } from '@/types/navigation';
import { spacing } from '@/theme/spacing';

type Props = NativeStackScreenProps<CustomerStackParamList, 'PaymentSuccess'>;

export function PaymentSuccessScreen({ navigation, route }: Props) {
  const { amount, planName, activationDate, paymentId } = route.params;
  const scale = useRef(new Animated.Value(0)).current;
  const [fetchInvoice, { isFetching }] = useLazyGetInvoiceUrlQuery();

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [scale]);

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
      // Silent — user can retry
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
    <Screen safeAreaTop style={styles.screen}>
      <Animated.View style={[styles.checkWrap, { transform: [{ scale }] }]}>
        <Text style={styles.check}>✓</Text>
      </Animated.View>
      <Text style={styles.title}>Payment successful!</Text>
      <Text style={styles.subtitle}>Your plan is being activated</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Amount paid</Text>
          <Text style={styles.value}>₹{amount.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Plan</Text>
          <Text style={styles.value}>{planName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Activation date</Text>
          <Text style={styles.value}>{activationLabel}</Text>
        </View>
      </View>

      <Button
        label={isFetching ? 'Preparing invoice…' : 'Download Invoice'}
        onPress={onDownloadInvoice}
        disabled={isFetching}
        style={styles.btn}
      />
      <Button label="Back to Home" variant="ghost" onPress={onBackToHome} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { alignItems: 'center', justifyContent: 'center' },
  checkWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.successGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  check: { color: colors.white, fontSize: 44, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { color: colors.textSecondary, marginBottom: spacing.xl },
  card: {
    width: '100%',
    backgroundColor: colors.surfaceWhite,
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: colors.textSecondary },
  value: { fontWeight: '600', color: colors.textPrimary },
  btn: { width: '100%', marginBottom: spacing.sm },
});
