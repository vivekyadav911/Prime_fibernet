import { Alert } from 'react-native';

function confirmAlert(title: string, message: string, confirmLabel: string, destructive = false): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

export function confirmStartShift(): Promise<boolean> {
  return confirmAlert(
    'Start shift?',
    'Do you want to start your shift for today?',
    'Start shift',
  );
}

export function confirmFinishShift(): Promise<boolean> {
  return confirmAlert(
    'Finish shift?',
    'Do you want to finish your shift? You can only clock in again tomorrow. Contact admin if attendance needs a correction.',
    'Finish shift',
    true,
  );
}
