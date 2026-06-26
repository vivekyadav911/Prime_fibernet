import { useEffect } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AdminInvoicesStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<AdminInvoicesStackParamList, 'ManualGstInvoice'>;

/** @deprecated Use CreateInvoice with invoiceType gst */
export function ManualGSTInvoiceScreen({ navigation }: Props) {
  useEffect(() => {
    navigation.replace('CreateInvoice', { invoiceType: 'gst' });
  }, [navigation]);

  return null;
}
