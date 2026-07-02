import { useCallback } from 'react';
import { ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigationProp } from '@react-navigation/native';

import { CreateTicketForm } from '@/components/TicketPortal';
import { AdminScreenLayout, RoleGuard } from '@/components/admin';
import { useTickets } from '@/hooks/useTickets';
import { adminScreenStyles } from '@/theme/adminScreenStyles';
import type { AdminDrawerParamList, AdminSupportStackParamList, AdminTicketsStackParamList } from '@/types/navigation';

type SupportProps = NativeStackScreenProps<AdminSupportStackParamList, 'CreateTicket'>;
type PortalProps = NativeStackScreenProps<AdminTicketsStackParamList, 'CreateTicket'>;
type Props = SupportProps | PortalProps;

export function CreateTicketScreen({ navigation, route }: Props) {
  const { reload } = useTickets();

  const handleCreated = useCallback(async () => {
    await reload(true);
    const drawer = navigation.getParent<NavigationProp<AdminDrawerParamList>>();
    if (drawer?.navigate) {
      drawer.navigate('TicketPortal', {
        screen: 'TicketPortalHome',
        params: { initialTab: 'all' },
      });
      return;
    }
    if ('navigate' in navigation) {
      (navigation as PortalProps['navigation']).navigate('TicketPortalHome', { initialTab: 'all' });
    }
  }, [navigation, reload]);

  return (
    <RoleGuard requiredPermission="requests.view">
      <AdminScreenLayout>
        <ScrollView contentContainerStyle={adminScreenStyles.listContent}>
          <CreateTicketForm
            linkedRequestId={route.params?.linkedRequestId}
            linkedRequestNumber={route.params?.linkedRequestNumber}
            initialCustomerId={route.params?.customerId}
            onCreated={handleCreated}
          />
        </ScrollView>
      </AdminScreenLayout>
    </RoleGuard>
  );
}
