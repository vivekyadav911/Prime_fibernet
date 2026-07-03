import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomerButton } from '@/components/customer/ui';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';

type PlanChangeConfirmSheetProps = {
  visible: boolean;
  currentPlanName: string;
  requestedPlanName: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PlanChangeConfirmSheet({
  visible,
  currentPlanName,
  requestedPlanName,
  loading,
  onConfirm,
  onCancel,
}: PlanChangeConfirmSheetProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Dismiss" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Confirm plan change</Text>
        <Text style={styles.body}>
          Request upgrade from {currentPlanName} to {requestedPlanName}?
        </Text>
        <Text style={styles.note}>Our team will process your request within 24 hours.</Text>
        <CustomerButton
          label={loading ? 'Submitting…' : 'Confirm request'}
          onPress={onConfirm}
          disabled={loading}
        />
        <CustomerButton label="Cancel" variant="ghost" onPress={onCancel} disabled={loading} />
      </View>
    </Modal>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
    },
    sheet: {
      backgroundColor: theme.colors.bgSurface,
      borderTopLeftRadius: theme.radius.lg,
      borderTopRightRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      gap: theme.spacing.sm,
      borderTopWidth: 1,
      borderColor: theme.colors.borderSubtle,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.textMuted,
      marginBottom: theme.spacing.sm,
    },
    title: {
      ...theme.typography.displayMd,
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.onSurfaceVariant,
      fontFamily: theme.fonts.body,
    },
    note: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.body,
      marginBottom: theme.spacing.sm,
    },
  });
