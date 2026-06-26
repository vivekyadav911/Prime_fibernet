import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';
import { deliverBroadcastNotification, verifyAdminAccess } from '../_shared/notificationDelivery.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

type SendBody = {
  notificationId: string;
  skipPush?: boolean;
  skipInApp?: boolean;
  /** Internal cron/system calls pass service role bearer */
  systemCall?: boolean;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as SendBody;
    const { notificationId, skipPush, skipInApp } = body;
    if (!notificationId) throw new Error('notificationId is required');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get('Authorization') ?? '';

    const isServiceRole = authHeader.includes(SUPABASE_SERVICE_ROLE_KEY);
    if (!isServiceRole && !body.systemCall) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: authData, error: authErr } = await userClient.auth.getUser();
      if (authErr || !authData.user) throw new Error('Unauthorized');
      const allowed = await verifyAdminAccess(supabase, authData.user.id);
      if (!allowed) throw new Error('Admin access required');
    }

    const result = await deliverBroadcastNotification(supabase, notificationId, {
      skipPush,
      skipInApp,
    });

    return new Response(JSON.stringify({ ok: true, notificationId, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
