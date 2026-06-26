import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';
import { deliverBroadcastNotification, recoverStuckSending } from '../_shared/notificationDelivery.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const recovered = await recoverStuckSending(supabase);

    const now = new Date().toISOString();
    const { data: due, error } = await supabase
      .from('broadcast_notifications')
      .select('id')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now);
    if (error) throw error;

    const results: { id: string; status: string }[] = [];
    for (const row of due ?? []) {
      const id = String(row.id);
      try {
        const delivery = await deliverBroadcastNotification(supabase, id);
        results.push({ id, status: delivery.status });
      } catch (e) {
        results.push({ id, status: `error: ${(e as Error).message}` });
      }
    }

    return new Response(JSON.stringify({ recovered, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
