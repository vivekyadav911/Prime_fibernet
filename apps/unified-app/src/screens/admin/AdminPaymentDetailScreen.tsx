import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { InvoiceContent } from '@/screens/officer/InvoiceScreen';
import type { AdminStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<AdminStackParamList, 'PaymentDetail'>;

export function AdminPaymentDetailScreen({ route }: Props) {
  return <InvoiceContent invoiceId={route.params.paymentId} />;
}
