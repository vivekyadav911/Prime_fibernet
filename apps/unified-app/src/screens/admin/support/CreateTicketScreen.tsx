import { useCallback } from 'react';
import { ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@prime/ui';

import { CreateTicketForm } from '@/components/TicketPortal';
import { RoleGuard } from '@/components/admin';
import { useTickets } from '@/hooks/useTickets';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import type { AdminSupportStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<AdminSupportStackParamList, 'CreateTicket'>;

export function CreateTicketScreen({ navigation, route }: Props) {
  const { reload } = useTickets();

  const handleCreated = useCallback(async () => {
    await reload(true);
    navigation.navigate('Tickets');
  }, [reload, navigation]);

  return (
    <RoleGuard requiredPermission="requests.view">
      <Screen style={adminScreenStyles.canvas}>
        <ScrollView>
          <CreateTicketForm
            linkedRequestId={route.params?.linkedRequestId}
            linkedRequestNumber={route.params?.linkedRequestNumber}
            initialCustomerId={route.params?.customerId}
            onCreated={handleCreated}
          />
        </ScrollView>
      </Screen>
    </RoleGuard>
  );
}
