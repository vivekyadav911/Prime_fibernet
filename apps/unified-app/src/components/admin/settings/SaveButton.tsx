import { StyleSheet } from 'react-native';

import { AdminButton } from '@/components/admin/AdminButton';
import { useAdminPermission } from '@/components/admin/RoleGuard';
import { spacing } from '@/theme/spacing';

type SaveButtonProps = {
  label?: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function SaveButton({
  label = 'Save Settings',
  onPress,
  loading,
  disabled,
}: SaveButtonProps) {
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
  btn: { marginTop: spacing.lg, marginBottom: spacing.xl },
});
