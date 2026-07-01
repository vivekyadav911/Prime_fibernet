import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

import { corsHeaders } from '../_shared/cors.ts';
import { getGatewaySession, getWhatsAppSettings } from '../_shared/whatsapp.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENWA_API_MASTER_KEY = Deno.env.get('OPENWA_API_MASTER_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const settings = await getWhatsAppSettings(supabase);
    if (!settings) {
      return new Response(JSON.stringify({ connected: false, enabled: false, error: 'Settings missing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!settings.enabled) {
      return new Response(JSON.stringify({ connected: false, enabled: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const healthRes = await fetch(`${settings.gateway_url.replace(/\/+$/, '')}/api/health`, {
      headers: { Authorization: `Bearer ${OPENWA_API_MASTER_KEY}` },
      signal: AbortSignal.timeout(5_000),
    }).catch(() => null);

    if (!healthRes?.ok) {
      return new Response(JSON.stringify({ connected: false, enabled: true, gatewayHealthy: false, error: 'Gateway unreachable' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!settings.gateway_session_id) {
      return new Response(JSON.stringify({ connected: false, enabled: true, gatewayHealthy: true, error: 'Session ID not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const session = await getGatewaySession(
      settings.gateway_url,
      OPENWA_API_MASTER_KEY,
      settings.gateway_session_id,
    );

    if (!session.ok || !session.body) {
      return new Response(JSON.stringify({ connected: false, enabled: true, gatewayHealthy: true, error: session.error ?? 'Session lookup failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const status = String(session.body.status ?? '').toLowerCase();
    const connected = status === 'ready' || status === 'connected';

    return new Response(JSON.stringify({
      connected,
      enabled: true,
      gatewayHealthy: true,
      sessionStatus: session.body.status ?? null,
      sessionPhone: session.body.phone ?? null,
      sessionName: session.body.name ?? null,
      sessionLastError: session.body.lastError ?? null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ connected: false, enabled: true, gatewayHealthy: false, error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
