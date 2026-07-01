import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';
import { deliverBroadcastNotification } from '../_shared/notificationDelivery.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date().toISOString();

    const { data: breachedTickets, error } = await supabase
      .from('tickets')
      .select('id, ticket_number, priority, assigned_officer_id, escalation_level, sla_resolution_deadline')
      .not('status', 'in', '("Resolved","Closed")')
      .eq('resolution_sla_status', 'pending')
      .lt('sla_resolution_deadline', now);

    if (error) throw error;

    let processed = 0;

    for (const ticket of breachedTickets ?? []) {
      const deadline = new Date(ticket.sla_resolution_deadline as string);
      const minutesOverdue = Math.floor((Date.now() - deadline.getTime()) / 60000);
      const newLevel = (ticket.escalation_level as number) + 1;

      await supabase
        .from('tickets')
        .update({
          resolution_sla_status: 'breached',
          sla_resolution_breached: true,
          escalation_level: newLevel,
          updated_at: now,
        })
        .eq('id', ticket.id);

      await supabase.from('sla_breaches').insert({
        ticket_id: ticket.id,
        breach_type: 'resolution',
        priority: ticket.priority,
        minutes_overdue: minutesOverdue,
      });

      if (ticket.assigned_officer_id) {
        const { data: officer } = await supabase
          .from('officers')
          .select('user_id')
          .eq('id', ticket.assigned_officer_id)
          .maybeSingle();

        if (officer?.user_id) {
          const { data: rule } = await supabase
            .from('notification_automation_rules')
            .select('*')
            .eq('event_key', 'sla_breach')
            .maybeSingle();

          if (rule?.enabled) {
            const channels = (rule.channels as { push?: boolean; in_app?: boolean }) ?? {
              push: true,
              in_app: true,
            };
            const title = String(rule.title_template).replace('{ticketNumber}', String(ticket.ticket_number));
            const message = String(rule.message_template).replace('{ticketNumber}', String(ticket.ticket_number));

            const { data: broadcast } = await supabase
              .from('broadcast_notifications')
              .insert({
                title,
                message,
                priority: rule.priority ?? 'Urgent',
                event_type: rule.event_type ?? 'ticketUpdate',
                status: 'sending',
                audience_type: 'specific_users',
                audience_user_ids: [officer.user_id],
                audience_estimated_count: 1,
                is_draft: false,
                is_auto_generated: true,
                linked_ticket_id: ticket.id,
                created_by_id: 'system',
                created_by_name: 'SLA Cron',
                tags: ['auto', 'sla_breach'],
                timezone: 'Asia/Kolkata',
              })
              .select('id')
              .single();

            if (broadcast?.id) {
              await deliverBroadcastNotification(supabase, String(broadcast.id), {
                skipPush: !channels.push,
                skipInApp: !channels.in_app,
              });
            }
          }
        }
      }

      processed += 1;
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
