import { StyleSheet } from 'react-native';
import { Button } from '@prime/ui';

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
    <Button
      label={loading ? 'Saving…' : label}
      onPress={onPress}
      disabled={disabled || !canEdit || loading}
      style={styles.btn}
    />
  );
}

const styles = StyleSheet.create({
  btn: { marginTop: spacing.lg, marginBottom: spacing.xl },
});
