import { Pressable, StyleSheet, Text } from 'react-native';

import { useAdminPermission } from '@/components/admin/RoleGuard';

import { BTN_H } from '../adminAccountFormStyles';
import { ui } from '../adminAccountUi';

type AdminAccountPrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function AdminAccountPrimaryButton({
  label,
  onPress,
  loading,
  disabled,
}: AdminAccountPrimaryButtonProps) {
  const canEdit = useAdminPermission('settings.edit');
  const isDisabled = disabled || !canEdit || loading;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        isDisabled && styles.btnDisabled,
        pressed && !isDisabled && styles.btnPressed,
      ]}
    >
      <Text style={styles.btnText}>{loading ? 'Saving…' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: BTN_H,
    borderRadius: ui.btnRadius,
    backgroundColor: ui.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  btnPressed: {
    opacity: 0.92,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
