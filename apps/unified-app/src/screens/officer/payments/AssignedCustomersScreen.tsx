import { useEffect } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { OfficerCollectionsStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<OfficerCollectionsStackParamList, 'AssignedCustomers'>;

/** @deprecated Use CollectionsList with initialTab="open_pool" */
export function AssignedCustomersScreen({ navigation }: Props) {
  useEffect(() => {
    navigation.replace('CollectionsList', { initialTab: 'open_pool' });
  }, [navigation]);

  return null;
}
