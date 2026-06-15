import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { TicketDetailScreen } from '@/screens/admin/ticketPortal/TicketDetailScreen';
import type { AdminSupportStackParamList, AdminTicketsStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<AdminSupportStackParamList, 'TicketDetail'>;

export function SupportTicketDetailScreen(props: Props) {
  return (
    <TicketDetailScreen
      navigation={props.navigation as NativeStackScreenProps<AdminTicketsStackParamList, 'TicketDetail'>['navigation']}
      route={props.route as unknown as NativeStackScreenProps<AdminTicketsStackParamList, 'TicketDetail'>['route']}
    />
  );
}
