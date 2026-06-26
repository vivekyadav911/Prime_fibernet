import type { ReactNode } from 'react';
import { Modal, StyleSheet, View, type ModalProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

import { KeyboardDismissView } from './KeyboardDismissView';
import { ModalSheetHeader } from './ModalSheetHeader';

type FullScreenModalShellProps = {
  visible: boolean;
  onRequestClose: () => void;
  title: string;
  onCancel: () => void;
  onDone?: () => void;
  doneLabel?: string;
  cancelLabel?: string;
  doneDisabled?: boolean;
  children: ReactNode;
  statusBarTranslucent?: boolean;
} & Pick<ModalProps, 'animationType'>;

export function FullScreenModalShell({
  visible,
  onRequestClose,
  title,
  onCancel,
  onDone,
  doneLabel,
  cancelLabel,
  doneDisabled,
  children,
  statusBarTranslucent = false,
  animationType = 'slide',
}: FullScreenModalShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType={animationType}
      presentationStyle="fullScreen"
      onRequestClose={onRequestClose}
      statusBarTranslucent={statusBarTranslucent}
    >
      <View style={[styles.root, { paddingBottom: insets.bottom }]}>
        <ModalSheetHeader
          title={title}
          onCancel={onCancel}
          onDone={onDone}
          doneLabel={doneLabel}
          cancelLabel={cancelLabel}
          doneDisabled={doneDisabled}
        />
        <KeyboardDismissView style={styles.body}>{children}</KeyboardDismissView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surfaceWhite,
  },
  body: {
    flex: 1,
  },
});
