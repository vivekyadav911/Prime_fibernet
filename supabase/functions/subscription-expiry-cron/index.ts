import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';
import {
  deliverBroadcastNotification,
  replaceTemplateVars,
} from '../_shared/notificationDelivery.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const today = new Date().toISOString().slice(0, 10);

    await supabase
      .from('subscriptions')
      .update({ status: 'expired' })
      .lt('end_at', today)
      .eq('status', 'active');

    const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const { data: expiring } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('end_at', in7)
      .eq('status', 'active');

    const { data: rule } = await supabase
      .from('notification_automation_rules')
      .select('*')
      .eq('event_key', 'subscription_expiry')
      .maybeSingle();

    let sent = 0;
    for (const sub of expiring ?? []) {
      if (!rule?.enabled) continue;
      const userId = String(sub.user_id);
      const channels = (rule.channels as { push?: boolean; in_app?: boolean }) ?? {
        push: true,
        in_app: true,
      };
      const title = replaceTemplateVars(String(rule.title_template), {});
      const message = replaceTemplateVars(String(rule.message_template), {});

      const { data: broadcast, error: insertErr } = await supabase
        .from('broadcast_notifications')
        .insert({
          title,
          message,
          priority: rule.priority ?? 'High',
          event_type: rule.event_type ?? 'planExpiry',
          status: 'sending',
          audience_type: 'specific_users',
          audience_user_ids: [userId],
          audience_estimated_count: 1,
          is_draft: false,
          is_auto_generated: true,
          is_scheduled: false,
          created_by_id: 'system',
          created_by_name: 'Subscription Cron',
          tags: ['auto', 'subscription_expiry'],
          timezone: 'Asia/Kolkata',
        })
        .select('id')
        .single();
      if (insertErr) continue;

      await deliverBroadcastNotification(supabase, String(broadcast.id), {
        skipPush: !channels.push,
        skipInApp: !channels.in_app,
      });
      sent += 1;
    }

    return new Response(JSON.stringify({ expired: true, reminders: expiring?.length ?? 0, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
