import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type Props = {
  vpa: string;
  amount: number;
  payeeName?: string;
};

/** Build a UPI deep-link payload with amount pre-filled. */
export function buildUpiPayload(vpa: string, amount: number, payeeName?: string): string {
  const params = new URLSearchParams({
    pa: vpa,
    am: amount.toFixed(2),
    cu: 'INR',
  });
  if (payeeName?.trim()) {
    params.set('pn', payeeName.trim());
  }
  return `upi://pay?${params.toString()}`;
}

export function UpiQrDisplay({ vpa, amount, payeeName }: Props) {
  const payload = buildUpiPayload(vpa, amount, payeeName);

  return (
    <View style={styles.wrap}>
      <View style={styles.qrBox}>
        <QRCode value={payload} size={200} backgroundColor={colors.surfaceWhite} />
      </View>
      <Text style={styles.hint}>Customer scans to pay {vpa}</Text>
      <Text style={styles.amount}>₹{amount.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  qrBox: {
    padding: spacing.md,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  hint: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  amount: { fontSize: 22, fontWeight: '700', color: colors.primaryNavy },
});
