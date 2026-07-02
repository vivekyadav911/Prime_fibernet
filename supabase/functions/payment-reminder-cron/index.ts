import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';
import {
  deliverBroadcastNotification,
  replaceTemplateVars,
} from '../_shared/notificationDelivery.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function formatAmount(amount: number): string {
  return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDueDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const today = new Date().toISOString().slice(0, 10);
    const in3 = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

    const { data: dueCustomers, error: dueErr } = await supabase
      .from('users')
      .select('id, name, outstanding_amount, next_due_date')
      .eq('role', 'customer')
      .gt('outstanding_amount', 0)
      .gte('next_due_date', today)
      .lte('next_due_date', in3);
    if (dueErr) throw dueErr;

    const { data: rule } = await supabase
      .from('notification_automation_rules')
      .select('*')
      .eq('event_key', 'payment_reminder')
      .maybeSingle();

    let sent = 0;
    for (const customer of dueCustomers ?? []) {
      if (!rule?.enabled) continue;
      const amount = Number(customer.outstanding_amount ?? 0);
      const dueDate = String(customer.next_due_date ?? today);
      const vars = {
        amount: formatAmount(amount),
        dueDate: formatDueDate(dueDate),
        customerName: String(customer.name ?? 'Customer'),
      };
      const title = replaceTemplateVars(String(rule.title_template), vars);
      const message = replaceTemplateVars(String(rule.message_template), vars);
      if (/\{\w+\}/.test(title) || /\{\w+\}/.test(message)) {
        continue;
      }

      const { data: broadcast, error: insertErr } = await supabase
        .from('broadcast_notifications')
        .insert({
          title,
          message,
          priority: rule.priority ?? 'High',
          event_type: rule.event_type ?? 'paymentReminder',
          status: 'sending',
          audience_type: 'specific_users',
          audience_user_ids: [customer.id],
          audience_estimated_count: 1,
          is_draft: false,
          is_auto_generated: true,
          is_scheduled: false,
          is_test: false,
          created_by_id: 'system',
          created_by_name: 'Payment Reminder Cron',
          tags: ['auto', 'payment_reminder'],
          timezone: 'Asia/Kolkata',
        })
        .select('id')
        .single();
      if (insertErr) continue;

      await deliverBroadcastNotification(supabase, String(broadcast.id), {
        skipPush: !(rule.channels as { push?: boolean })?.push,
        skipInApp: !(rule.channels as { in_app?: boolean })?.in_app,
      });
      sent += 1;
    }

    return new Response(
      JSON.stringify({ checked: dueCustomers?.length ?? 0, sent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
