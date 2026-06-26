import { StyleSheet, Text, View } from 'react-native';

import { ToggleSwitch } from '@/components/common';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { switchTheme } from '@/theme/switchTheme';

type NotificationTogglesProps = {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  onPushChange: (value: boolean) => void;
  onEmailChange: (value: boolean) => void;
  onSmsChange: (value: boolean) => void;
};

export function NotificationToggles({
  pushEnabled,
  emailEnabled,
  smsEnabled,
  onPushChange,
  onEmailChange,
  onSmsChange,
}: NotificationTogglesProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Notifications</Text>
      <ToggleRow label="Push notifications" value={pushEnabled} onChange={onPushChange} />
      <ToggleRow label="Email notifications" value={emailEnabled} onChange={onEmailChange} />
      <ToggleRow label="SMS alerts" value={smsEnabled} onChange={onSmsChange} />
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <ToggleSwitch value={value} onValueChange={onChange} accentColor={switchTheme.accentCustomer} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: colors.textPrimary, fontSize: 15 },
});
