import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';
import { computeNextRunAt, deliverBroadcastNotification } from '../_shared/notificationDelivery.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date().toISOString();

    const { data: schedules, error } = await supabase
      .from('notification_recurring_schedules')
      .select('*')
      .eq('enabled', true)
      .lte('next_run_at', now);
    if (error) throw error;

    const results: { scheduleId: string; notificationId?: string; status: string }[] = [];

    for (const schedule of schedules ?? []) {
      const scheduleId = String(schedule.id);
      try {
        const { data: broadcast, error: insertErr } = await supabase
          .from('broadcast_notifications')
          .insert({
            title: schedule.title,
            message: schedule.message,
            priority: schedule.priority ?? 'Normal',
            event_type: schedule.event_type ?? 'none',
            status: 'sending',
            audience_type: schedule.audience_type,
            audience_plan_id: schedule.audience_plan_id ?? null,
            audience_plan_name: schedule.audience_plan_name ?? null,
            audience_area: schedule.audience_area ?? null,
            audience_user_ids: schedule.audience_user_ids ?? null,
            audience_user_names: schedule.audience_user_names ?? null,
            is_draft: false,
            is_auto_generated: true,
            is_scheduled: false,
            created_by_id: schedule.created_by_id ?? 'system',
            created_by_name: schedule.created_by_name ?? 'Recurring Scheduler',
            tags: ['recurring', String(schedule.name ?? 'schedule')],
            timezone: schedule.timezone ?? 'Asia/Kolkata',
          })
          .select('id')
          .single();
        if (insertErr) throw insertErr;

        const notificationId = String(broadcast.id);
        const delivery = await deliverBroadcastNotification(supabase, notificationId);

        const nextRun = computeNextRunAt(
          String(schedule.frequency ?? 'weekly'),
          String(schedule.time_of_day ?? '09:00'),
          String(schedule.timezone ?? 'Asia/Kolkata'),
          schedule.day_of_week != null ? Number(schedule.day_of_week) : null,
        );

        await supabase
          .from('notification_recurring_schedules')
          .update({
            last_run_at: now,
            next_run_at: nextRun.toISOString(),
            updated_at: now,
          })
          .eq('id', scheduleId);

        results.push({ scheduleId, notificationId, status: delivery.status });
      } catch (e) {
        results.push({ scheduleId, status: `error: ${(e as Error).message}` });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
