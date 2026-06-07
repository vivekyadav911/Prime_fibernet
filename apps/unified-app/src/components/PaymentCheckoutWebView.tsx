import { Modal, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Button, colors } from '@prime/ui';

import type { PaymentGateway } from '@prime/types';

type Props = {
  visible: boolean;
  checkoutUrl: string | null;
  paymentId: string;
  orderId: string;
  gateway: PaymentGateway;
  onClose: () => void;
  onSuccess: () => void;
  onVerify: (params: { paymentId: string; orderId: string; gateway: PaymentGateway }) => Promise<void>;
};

export function PaymentCheckoutWebView({
  visible,
  checkoutUrl,
  paymentId,
  orderId,
  gateway,
  onClose,
  onSuccess,
  onVerify,
}: Props) {
  const handleComplete = async () => {
    await onVerify({ paymentId, orderId, gateway });
    onSuccess();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.header}>
        <Button label="Cancel" variant="ghost" onPress={onClose} />
        <Button label="Complete payment" onPress={handleComplete} />
      </View>
      {checkoutUrl ? (
        <WebView source={{ uri: checkoutUrl }} style={styles.webview} />
      ) : (
        <View style={styles.placeholder}>
          <Button label="Simulate successful payment" onPress={handleComplete} />
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    paddingTop: 48,
    backgroundColor: colors.surfaceWhite,
    borderBottomWidth: 1,
    borderColor: colors.borderDefault,
  },
  webview: { flex: 1 },
  placeholder: { flex: 1, justifyContent: 'center', padding: 24 },
});
