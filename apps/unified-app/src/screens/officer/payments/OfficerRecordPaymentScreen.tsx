import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenWrapper } from '@/components/common';

import { OfficerRecordPaymentForm } from './components/OfficerRecordPaymentForm';
import type { OfficerCollectionsStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<OfficerCollectionsStackParamList, 'RecordPayment'>;

export function OfficerRecordPaymentScreen({ navigation }: Props) {
  return (
    <ScreenWrapper scrollable={false}>
      <OfficerRecordPaymentForm
        onSuccess={() => navigation.navigate('CollectionHistory')}
        onCancel={() => navigation.goBack()}
      />
    </ScreenWrapper>
  );
}
