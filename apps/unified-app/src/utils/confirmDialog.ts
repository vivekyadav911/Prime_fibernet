import { Alert, Platform } from 'react-native';

// react-native-web's Alert.alert is a no-op, so confirm/prompt/notify flows that
// rely on RN Alert silently do nothing on web. These helpers fall back to the
// browser's native dialogs on web and use RN Alert on native.

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  const {
    title,
    message = '',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
  } = opts;

  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(text) : false);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}

export function promptDialog(opts: ConfirmOptions): Promise<{ confirmed: boolean; value: string | null }> {
  const {
    title,
    message = '',
    confirmLabel = 'Submit',
    cancelLabel = 'Cancel',
    destructive = false,
  } = opts;

  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    const value = typeof window !== 'undefined' ? window.prompt(text) : null;
    return Promise.resolve({ confirmed: value !== null, value });
  }

  if (Alert.prompt) {
    return new Promise((resolve) => {
      Alert.prompt(
        title,
        message,
        [
          { text: cancelLabel, style: 'cancel', onPress: () => resolve({ confirmed: false, value: null }) },
          {
            text: confirmLabel,
            style: destructive ? 'destructive' : 'default',
            onPress: (value?: string) => resolve({ confirmed: true, value: value ?? null }),
          },
        ],
        'plain-text',
      );
    });
  }

  // Android/native without prompt support: confirm without a note.
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve({ confirmed: false, value: null }) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve({ confirmed: true, value: null }),
      },
    ]);
  });
}

export function notifyDialog(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message ?? '');
}
