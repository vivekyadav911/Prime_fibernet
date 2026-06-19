import { useEffect } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Linking, StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CommonActions } from '@react-navigation/native';

import { CustomerButton } from '@/components/customer/ui';
import { useLazyGetInvoiceUrlQuery } from '@/services/api';
import { signalGlass } from '@/theme/customer/signalGlass';
import type { CustomerStackParamList } from '@/types/navigation';
import { formatCurrencyInr } from '@/utils/formatCurrency';

type Props = NativeStackScreenProps<CustomerStackParamList, 'PaymentSuccess'>;

export function PaymentSuccessScreen({ navigation, route }: Props) {
  const { amount, planName, activationDate, paymentId } = route.params;
  const scale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const [fetchInvoice, { isFetching }] = useLazyGetInvoiceUrlQuery();

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12 });
    checkOpacity.value = withTiming(1, { duration: 400 });
  }, [checkOpacity, scale]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: checkOpacity.value,
  }));

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
    <View style={styles.screen}>
      <Animated.View style={[styles.checkWrap, checkStyle]}>
        <Text style={styles.check}>✓</Text>
      </Animated.View>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: signalGlass.colors.bgDeep,
    padding: signalGlass.spacing.xl,
    justifyContent: 'center',
  },
  checkWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderWidth: 2,
    borderColor: signalGlass.colors.accentSuccess,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: signalGlass.spacing.xl,
  },
  check: { fontSize: 40, color: signalGlass.colors.accentSuccess, fontWeight: '700' },
  title: {
    color: signalGlass.colors.textPrimary,
    fontFamily: signalGlass.fonts.display,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: signalGlass.colors.textSecondary,
    textAlign: 'center',
    marginTop: signalGlass.spacing.xs,
    marginBottom: signalGlass.spacing.xl,
  },
  card: {
    backgroundColor: signalGlass.colors.bgSurface,
    borderRadius: signalGlass.radius.md,
    padding: signalGlass.spacing.lg,
    gap: signalGlass.spacing.md,
    marginBottom: signalGlass.spacing.xl,
    borderWidth: 1,
    borderColor: signalGlass.colors.borderSubtle,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: signalGlass.colors.textSecondary, fontSize: 14 },
  value: { color: signalGlass.colors.textPrimary, fontWeight: '600' },
  btn: { marginBottom: signalGlass.spacing.sm },
});

