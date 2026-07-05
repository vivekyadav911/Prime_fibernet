import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { CustomerTheme } from '@/theme/customer';
import { formatINR } from '@/utils/currencyFormat';

type PaymentSuccessSheetProps = {
  visible: boolean;
  paymentId: string;
  amount: number;
  invoiceNumber?: string;
  onClose: () => void;
  onDownloadReceipt: () => void;
  onRequestGST: () => void;
  onViewHistory: () => void;
};

export function PaymentSuccessSheet({
  visible,
  paymentId,
  amount,
  invoiceNumber,
  onClose,
  onDownloadReceipt,
  onRequestGST,
  onViewHistory,
}: PaymentSuccessSheetProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 40) }]}>
          <View style={styles.iconRing}>
            <Text style={styles.icon}>✓</Text>
          </View>

          <Text style={styles.title}>Payment Successful!</Text>
          <Text style={styles.amount}>{formatINR(amount)}</Text>
          <Text style={styles.subtitle}>
            {invoiceNumber ? `Invoice ${invoiceNumber}` : `Txn: ${paymentId}`}
          </Text>

          <View style={styles.divider} />

          <Pressable style={styles.primaryAction} onPress={onDownloadReceipt}>
            <Text style={styles.primaryActionIcon}>↓</Text>
            <Text style={styles.primaryActionText}>Download Receipt</Text>
          </Pressable>

          <Pressable style={styles.secondaryAction} onPress={onRequestGST}>
            <Text style={styles.secondaryActionIcon}>🧾</Text>
            <Text style={styles.secondaryActionText}>Request GST Invoice</Text>
          </Pressable>

          <Pressable style={styles.secondaryAction} onPress={onViewHistory}>
            <Text style={styles.secondaryActionIcon}>📋</Text>
            <Text style={styles.secondaryActionText}>View Payment History</Text>
          </Pressable>

          <Pressable style={styles.doneAction} onPress={onClose}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: CustomerTheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.colors.bgSurface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    iconRing: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.colors.surfaceContainerLow,
      borderWidth: 2,
      borderColor: theme.colors.accentSuccess,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
      marginBottom: 16,
    },
    icon: {
      fontSize: 36,
      color: theme.colors.accentSuccess,
      fontWeight: '800',
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: theme.colors.onSurface,
      fontFamily: theme.fonts.bodySemiBold,
      marginBottom: 8,
    },
    amount: {
      fontSize: 32,
      fontWeight: '900',
      color: theme.colors.primary,
      fontFamily: theme.fonts.monoBold,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 13,
      color: theme.colors.textMuted,
      fontFamily: theme.fonts.body,
      marginBottom: 24,
    },
    divider: {
      width: '100%',
      height: 1,
      backgroundColor: theme.colors.borderSubtle,
      marginBottom: 20,
    },
    primaryAction: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 24,
      width: '100%',
      marginBottom: 12,
      gap: 10,
    },
    primaryActionIcon: {
      fontSize: 18,
      color: theme.colors.onPrimary,
    },
    primaryActionText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.onPrimary,
      flex: 1,
      textAlign: 'center',
      fontFamily: theme.fonts.bodySemiBold,
    },
    secondaryAction: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceContainerLow,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 24,
      width: '100%',
      marginBottom: 10,
      gap: 10,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
    },
    secondaryActionIcon: {
      fontSize: 18,
    },
    secondaryActionText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.onSurface,
      flex: 1,
      fontFamily: theme.fonts.bodyMedium,
    },
    doneAction: {
      paddingVertical: 14,
      marginTop: 4,
    },
    doneText: {
      fontSize: 15,
      color: theme.colors.textMuted,
      fontWeight: '600',
      fontFamily: theme.fonts.bodyMedium,
    },
  });
