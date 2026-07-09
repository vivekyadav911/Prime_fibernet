import { StyleSheet, Text, View } from 'react-native';

import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import {
  formatCollectionCustomerStatus,
  type CollectionCustomerStatusInput,
} from '@/utils/collectionCustomerStatus';

const TONE_STYLES = {
  active: { bg: adminColors.navPillSuccessBg, text: adminColors.navPillSuccessText },
  inactive: { bg: colors.background, text: colors.textSecondary },
  warning: { bg: adminColors.navPillWarningBg, text: adminColors.navPillWarningText },
  success: { bg: adminColors.navPillSuccessBg, text: adminColors.navPillSuccessText },
  danger: { bg: adminColors.navPillDangerBg, text: adminColors.navPillDangerText },
} as const;

type Props = CollectionCustomerStatusInput;

export function CollectionCustomerStatusBadge(props: Props) {
  const status = formatCollectionCustomerStatus(props);
  const tone = TONE_STYLES[status.tone];
  const label = status.secondary ? `${status.primary} · ${status.secondary}` : status.primary;

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text style={[styles.text, { color: tone.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    maxWidth: '55%',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
