import { StyleSheet } from 'react-native';

import { AdminButton } from '@/components/admin/AdminButton';
import { useAdminPermission } from '@/components/admin/RoleGuard';

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

  return (
    <AdminButton
      label={label}
      loading={loading}
      loadingLabel="Saving…"
      onPress={onPress}
      disabled={disabled || !canEdit}
      fullWidth
      style={styles.btn}
    />
  );
}

const styles = StyleSheet.create({
  btn: { marginTop: 4 },
});
