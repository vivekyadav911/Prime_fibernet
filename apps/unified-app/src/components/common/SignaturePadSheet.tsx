import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SignatureCanvas, { type SignatureViewRef } from 'react-native-signature-canvas';

import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

type SignaturePadSheetProps = {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onConfirm: (base64Png: string) => void | Promise<void>;
  submitting?: boolean;
};

const CANVAS_STYLE = `
  .m-signature-pad { box-shadow: none; border: none; }
  .m-signature-pad--body { border: 1px solid #ddd; border-radius: 8px; }
  body, html { margin: 0; padding: 0; }
`;

export function SignaturePadSheet({
  visible,
  title = 'Sign contract',
  onClose,
  onConfirm,
  submitting = false,
}: SignaturePadSheetProps) {
  const insets = useSafeAreaInsets();
  const canvasRef = useRef<SignatureViewRef>(null);
  const [emptyError, setEmptyError] = useState(false);

  const handleClear = useCallback(() => {
    canvasRef.current?.clearSignature();
    setEmptyError(false);
  }, []);

  const handleConfirm = useCallback(() => {
    setEmptyError(false);
    canvasRef.current?.readSignature();
  }, []);

  const handleOk = useCallback(
    (signature: string) => {
      void onConfirm(signature);
    },
    [onConfirm],
  );

  const handleEmpty = useCallback(() => {
    setEmptyError(true);
  }, []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <Text style={styles.helper}>
            By signing, you agree this electronic signature is binding.
          </Text>

          <View style={styles.canvasWrap}>
            <SignatureCanvas
              ref={canvasRef}
              onOK={handleOk}
              onEmpty={handleEmpty}
              webStyle={CANVAS_STYLE}
              backgroundColor={colors.surfaceWhite}
              penColor={colors.textPrimary}
              descriptionText=""
              clearText=""
              confirmText=""
              autoClear={false}
            />
          </View>

          {emptyError ? (
            <Text style={styles.error}>Please draw your signature before confirming.</Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable style={styles.secondaryBtn} onPress={handleClear} disabled={submitting}>
              <Text style={styles.secondaryText}>Clear</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
              onPress={handleConfirm}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryText}>Confirm signature</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cancel: { color: colors.primaryNavy, fontWeight: '600', fontSize: 16, width: 72 },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSpacer: { width: 72 },
  helper: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  canvasWrap: {
    height: 220,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.errorRed,
    fontSize: 12,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
  },
  secondaryText: { color: colors.textPrimary, fontWeight: '600' },
  primaryBtn: {
    flex: 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryNavy,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryText: { color: colors.white, fontWeight: '700' },
});
