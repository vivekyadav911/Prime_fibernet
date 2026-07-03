import { useEffect } from 'react';

import { customerTicketsApi } from '@/services/api/customerTicketsApi';
import { getSupabase } from '@/services/supabase';
import { useAppDispatch } from '@/store/hooks';

type UseCustomerTicketRealtimeOptions = {
  ticketId?: string;
  customerUserId?: string;
  enabled?: boolean;
};

export function useCustomerTicketRealtime({
  ticketId,
  customerUserId,
  enabled = true,
}: UseCustomerTicketRealtimeOptions) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!enabled) return;

    const client = getSupabase();
    const channels: ReturnType<typeof client.channel>[] = [];

    const invalidate = () => {
      dispatch(customerTicketsApi.util.invalidateTags(['CustomerTickets']));
      if (ticketId) {
        dispatch(customerTicketsApi.util.invalidateTags([{ type: 'CustomerTickets', id: ticketId }]));
      }
    };

    if (ticketId) {
      channels.push(
        client
          .channel(`ticket-detail-${ticketId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'ticket_customer_messages',
              filter: `ticket_id=eq.${ticketId}`,
            },
            invalidate,
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'ticket_activity_events',
              filter: `ticket_id=eq.${ticketId}`,
            },
            invalidate,
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'tickets',
              filter: `id=eq.${ticketId}`,
            },
            invalidate,
          )
          .subscribe(),
      );
    }

    if (customerUserId) {
      channels.push(
        client
          .channel(`ticket-activity-customer-${customerUserId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'ticket_activity_events',
            },
            invalidate,
          )
          .subscribe(),
      );
    }

    return () => {
      channels.forEach((channel) => void client.removeChannel(channel));
    };
  }, [customerUserId, dispatch, enabled, ticketId]);
}
