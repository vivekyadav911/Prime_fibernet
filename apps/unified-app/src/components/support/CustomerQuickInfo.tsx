import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AvatarIcon } from '@/components/admin';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type CustomerQuickInfoProps = {
  name: string;
  accountNumber?: string | null;
  phone?: string | null;
  onViewProfile?: () => void;
};

export function CustomerQuickInfo({ name, accountNumber, phone, onViewProfile }: CustomerQuickInfoProps) {
  return (
    <View style={styles.card}>
      <AvatarIcon name={name} size={40} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {accountNumber ? (
          <Text style={styles.meta} numberOfLines={1}>
            Account: {accountNumber}
          </Text>
        ) : null}
        {phone ? (
          <Text style={styles.meta} numberOfLines={1}>
            {phone}
          </Text>
        ) : null}
      </View>
      {onViewProfile ? (
        <Pressable onPress={onViewProfile} style={styles.profileBtn}>
          <Text style={styles.link}>Profile</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: adminColors.cardBg,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary },
  profileBtn: { flexShrink: 0 },
  link: { fontSize: 12, fontWeight: '600', color: adminColors.primary },
});
