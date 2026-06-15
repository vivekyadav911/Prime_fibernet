import { useMemo } from 'react';

import { useGetAdminUserDetailQuery } from '@/store/api/endpoints';
import {
  useGetChatSessionsQuery,
  useGetComplaintsQuery,
  useGetCustomerInteractionsQuery,
} from '@/services/api/adminSupportApi';
import { useTickets } from '@/hooks/useTickets';

export function useCustomerSupport(customerId: string) {
  const { data: user, isLoading: userLoading } = useGetAdminUserDetailQuery(customerId);
  const { allTickets, loading: ticketsLoading } = useTickets();
  const { data: complaints, isLoading: complaintsLoading } = useGetComplaintsQuery();
  const { data: interactions, isLoading: interactionsLoading } = useGetCustomerInteractionsQuery(customerId);
  const { data: chats, isLoading: chatsLoading } = useGetChatSessionsQuery();

  const customerTickets = useMemo(
    () => allTickets.filter((t) => t.customerId === customerId).slice(0, 20),
    [allTickets, customerId],
  );

  const customerChats = useMemo(
    () => (chats ?? []).filter((c) => c.customerId === customerId).slice(0, 20),
    [chats, customerId],
  );

  const customerComplaints = useMemo(
    () => (complaints ?? []).filter((c) => c.customerId === customerId),
    [complaints, customerId],
  );

  const avgCsat = useMemo(() => {
    const scores = [
      ...customerTickets.filter((t) => t.csatScore != null).map((t) => t.csatScore!),
      ...customerChats.filter((c) => c.csatScore != null).map((c) => c.csatScore!),
    ];
    return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  }, [customerTickets, customerChats]);

  return {
    user,
    customerTickets,
    customerChats,
    customerComplaints,
    interactions: interactions ?? [],
    avgCsat,
    isLoading: userLoading || ticketsLoading || complaintsLoading || interactionsLoading || chatsLoading,
  };
}
