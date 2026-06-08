import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type PaymentDueBannerProps = {
  daysUntilExpiry: number;
  onPress?: () => void;
};

export function PaymentDueBanner({ daysUntilExpiry, onPress }: PaymentDueBannerProps) {
  return (
    <Pressable style={styles.banner} onPress={onPress}>
      <Text style={styles.text}>
        Payment due in {daysUntilExpiry} day{daysUntilExpiry === 1 ? '' : 's'}. Renew now to avoid interruption.
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warningAmber,
    padding: spacing.md,
  },
  text: {
    color: colors.white,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 14,
  },
});
