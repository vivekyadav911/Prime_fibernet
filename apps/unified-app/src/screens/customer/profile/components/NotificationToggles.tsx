import { StyleSheet, Text, View } from 'react-native';

import { ToggleSwitch } from '@/components/common';
import { GlassCard } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { switchTheme } from '@/theme/switchTheme';
import type { CustomerTheme } from '@/theme/customer';

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
  const styles = useThemedStyles(createStyles);

  return (
    <GlassCard padded contentStyle={styles.cardContent}>
      <Text style={styles.title}>Notifications</Text>
      <ToggleRow label="Push notifications" value={pushEnabled} onChange={onPushChange} />
      <ToggleRow label="Email notifications" value={emailEnabled} onChange={onEmailChange} />
      <ToggleRow label="SMS alerts" value={smsEnabled} onChange={onSmsChange} />
    </GlassCard>
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
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <ToggleSwitch value={value} onValueChange={onChange} accentColor={switchTheme.accentCustomer} />
    </View>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    cardContent: {
      gap: theme.spacing.sm,
    },
    title: {
      ...theme.typography.bodyLg,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.bodySemiBold,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 44,
      paddingVertical: theme.spacing.xs,
    },
    label: {
      ...theme.typography.bodyMedium,
      flex: 1,
      paddingRight: theme.spacing.sm,
      color: theme.colors.textPrimary,
      fontFamily: theme.fonts.body,
    },
  });
