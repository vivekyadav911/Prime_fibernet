import { Alert } from 'react-native';
import { Button } from '@prime/ui';

type ExportButtonProps = {
  label?: string;
  format: 'csv' | 'pdf';
  onExport: () => Promise<void>;
  disabled?: boolean;
};

export function ExportButton({ label, format, onExport, disabled }: ExportButtonProps) {
  const handlePress = async () => {
    try {
      await onExport();
      Alert.alert('Export ready', `${format.toUpperCase()} export completed.`);
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Could not export');
    }
  };

  return (
    <Button
      label={label ?? `Export ${format.toUpperCase()}`}
      variant="secondary"
      onPress={() => void handlePress()}
      disabled={disabled}
    />
  );
}
