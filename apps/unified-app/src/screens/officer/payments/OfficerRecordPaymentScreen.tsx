import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenWrapper } from '@/components/common';
import { RecordPaymentForm } from '@/screens/admin/payments/RecordPaymentScreen';
import type { OfficerCollectionsStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<OfficerCollectionsStackParamList, 'RecordPayment'>;

export function OfficerRecordPaymentScreen({ navigation }: Props) {
  return (
    <ScreenWrapper scrollable={false}>
      <RecordPaymentForm
        onSuccess={() => navigation.navigate('CollectionHistory')}
        onCancel={() => navigation.goBack()}
      />
    </ScreenWrapper>
  );
}
