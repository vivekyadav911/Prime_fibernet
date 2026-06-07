import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';

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

    for (const sub of expiring ?? []) {
      await supabase.from('notification_queue').insert({
        title: 'Subscription expiring soon',
        body: 'Your plan expires in 7 days. Renew now to avoid interruption.',
        audience: 'user',
        audience_filter: { user_id: sub.user_id },
        status: 'pending',
      });
    }

    return new Response(JSON.stringify({ expired: true, reminders: expiring?.length ?? 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
