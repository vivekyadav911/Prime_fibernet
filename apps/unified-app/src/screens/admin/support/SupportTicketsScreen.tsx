import { useEffect } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { NavigationProp } from '@react-navigation/native';

import { AdminScreenLayout } from '@/components/admin';
import { SkeletonLoader } from '@/components/common';
import type { AdminDrawerParamList, AdminSupportStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<AdminSupportStackParamList, 'Tickets'>;

/** Legacy Support Tickets route — redirects into Ticket Portal (All Tickets tab). */
export function SupportTicketsScreen({ navigation }: Props) {
  useEffect(() => {
    const drawer = navigation.getParent<NavigationProp<AdminDrawerParamList>>();
    if (drawer?.navigate) {
      drawer.navigate('TicketPortal', {
        screen: 'TicketPortalHome',
        params: { initialTab: 'all' },
      });
      return;
    }
    navigation.replace('SupportDashboard');
  }, [navigation]);

  return (
    <AdminScreenLayout>
      <SkeletonLoader rows={4} />
    </AdminScreenLayout>
  );
}
