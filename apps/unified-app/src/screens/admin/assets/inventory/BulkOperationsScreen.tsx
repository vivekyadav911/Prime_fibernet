import { useState } from 'react';
import { Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Screen } from '@prime/ui';

import { FormField, RoleGuard } from '@/components/admin';
import { useBulkImportInventoryMutation } from '@/store/api/endpoints';
import type { AdminInventoryStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<AdminInventoryStackParamList, 'BulkOperations'>;

export function BulkOperationsScreen(_props: Props) {
  const [csv, setCsv] = useState('item_name,category,quantity\nRouter X,Router,10');
  const [importCsv] = useBulkImportInventoryMutation();

  const onUpload = async () => {
    try {
      await importCsv({ csvData: csv }).unwrap();
      Alert.alert('Imported', 'Bulk inventory update queued.');
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Import failed');
    }
  };

  return (
    <RoleGuard requiredPermission="inventory.edit">
      <Screen>
        <FormField label="CSV data" value={csv} onChangeText={setCsv} multiline />
        <Button label="Upload CSV" onPress={() => void onUpload()} />
      </Screen>
    </RoleGuard>
  );
}
