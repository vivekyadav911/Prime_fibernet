import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import type { PaymentGatewayRecord } from '@/types/payments';
import { adminColors } from '@/theme/admin';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type Props = {
  gateway: PaymentGatewayRecord;
  onConfigure: () => void;
  onToggleActive: (active: boolean) => void;
};

export function GatewayCard({ gateway, onConfigure, onToggleActive }: Props) {
  const configured = Object.keys(gateway.credentials ?? {}).length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{gateway.name}</Text>
          {gateway.is_default ? <Text style={styles.defaultBadge}>Default</Text> : null}
        </View>
        <Switch value={gateway.is_active} onValueChange={onToggleActive} />
      </View>
      <Text style={styles.methods}>{gateway.supported_methods.join(' · ')}</Text>
      <Text style={styles.status}>{configured ? 'Configured' : 'Not configured'}</Text>
      <Pressable style={styles.btn} onPress={onConfigure}>
        <Text style={styles.btnText}>Configure</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: adminColors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  defaultBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: adminColors.primary,
    backgroundColor: adminColors.primaryTint,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  methods: { marginTop: spacing.xs, fontSize: 12, color: colors.textSecondary, textTransform: 'capitalize' },
  status: { marginTop: spacing.xs, fontSize: 13, color: colors.textSecondary },
  btn: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: adminColors.primaryTint,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  btnText: { color: adminColors.primary, fontWeight: '600' },
});
