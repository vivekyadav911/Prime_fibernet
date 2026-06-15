import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { TicketListScreen } from '@/screens/admin/ticketPortal/TicketListScreen';
import type { AdminSupportStackParamList, AdminTicketsStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<AdminSupportStackParamList, 'Tickets'>;

export function SupportTicketsScreen(props: Props) {
  return (
    <TicketListScreen
      navigation={props.navigation as NativeStackScreenProps<AdminTicketsStackParamList, 'TicketList'>['navigation']}
      route={props.route as unknown as NativeStackScreenProps<AdminTicketsStackParamList, 'TicketList'>['route']}
    />
  );
}
