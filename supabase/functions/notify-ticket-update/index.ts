import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type ActivityPayload = {
  ticket_id: string;
  type: string;
  description?: string;
  performed_by?: string;
  performed_by_role?: string;
  id?: string;
};

function parseBody(body: unknown): ActivityPayload | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;

  if (record.record && typeof record.record === 'object') {
    const row = record.record as Record<string, unknown>;
    return {
      ticket_id: String(row.ticket_id ?? ''),
      type: String(row.type ?? ''),
      description: row.description ? String(row.description) : undefined,
      performed_by: row.performed_by ? String(row.performed_by) : undefined,
      performed_by_role: row.performed_by_role ? String(row.performed_by_role) : undefined,
      id: row.id ? String(row.id) : undefined,
    };
  }

  return {
    ticket_id: String(record.ticket_id ?? record.ticketId ?? ''),
    type: String(record.type ?? record.event_type ?? ''),
    description: record.description ? String(record.description) : undefined,
    performed_by: record.performed_by ? String(record.performed_by) : undefined,
    performed_by_role: record.performed_by_role ? String(record.performed_by_role) : undefined,
    id: record.id ? String(record.id) : undefined,
  };
}

function notificationCopy(type: string, ticketNumber: string, description?: string): { title: string; body: string } {
  const title = (() => {
    switch (type) {
      case 'officer_assigned':
        return 'Officer assigned to your ticket';
      case 'officer_reassigned':
        return 'Ticket reassigned';
      case 'status_changed':
        return 'Ticket status updated';
      case 'resolved':
        return 'Ticket resolved';
      case 'closed':
        return 'Ticket closed';
      case 'reopened':
        return 'Ticket reopened';
      default:
        return 'Ticket update';
    }
  })();

  const body = description?.trim() || title;
  return {
    title,
    body: ticketNumber ? `${ticketNumber}: ${body}` : body,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const raw = await req.json();
    const activity = parseBody(raw);
    if (!activity?.ticket_id || !activity.type) {
      throw new Error('ticket_id and type are required');
    }

    if (activity.type === 'created') {
      return new Response(JSON.stringify({ skipped: true, reason: 'created' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if ((activity.performed_by_role ?? '').toLowerCase().includes('customer')) {
      return new Response(JSON.stringify({ skipped: true, reason: 'customer_event' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: ticket, error: ticketErr } = await supabase
      .from('tickets')
      .select('id, ticket_number, customer_id, contact_name')
      .eq('id', activity.ticket_id)
      .maybeSingle();
    if (ticketErr) throw ticketErr;
    if (!ticket?.customer_id) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no_customer' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: customer } = await supabase
      .from('users')
      .select('auth_user_id, phone, name')
      .eq('id', ticket.customer_id)
      .maybeSingle();

    const copy = notificationCopy(activity.type, ticket.ticket_number ?? '', activity.description);

    let pushSent = 0;
    if (customer?.auth_user_id) {
      const { data: tokens } = await supabase
        .from('user_fcm_tokens')
        .select('token')
        .eq('user_id', customer.auth_user_id)
        .eq('is_active', true);

      const pushTokens = (tokens ?? [])
        .map((row) => (row as { token?: string }).token)
        .filter((token): token is string => Boolean(token));

      if (pushTokens.length) {
        const messages = pushTokens.map((token) => ({
          to: token,
          title: copy.title,
          body: copy.body,
          data: {
            ticketId: ticket.id,
            type: 'ticket_update',
          },
          sound: 'default',
        }));

        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(messages),
        });

        if (res.ok) {
          const json = (await res.json()) as { data?: { status: string }[] } | { status: string }[];
          const receipts = Array.isArray(json) ? json : json.data ?? [];
          pushSent = receipts.filter((r) => r.status === 'ok').length;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        pushSent,
        ticket_id: ticket.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
