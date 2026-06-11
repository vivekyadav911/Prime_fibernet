import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';
import { decryptPassword } from '../_shared/officerCredentials.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization');

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: isAdmin, error: rpcError } = await userClient.rpc('is_admin_user');
    if (rpcError) throw rpcError;
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { officerId } = (await req.json()) as { officerId?: string };
    if (!officerId) throw new Error('officerId is required');

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: creds, error: credError } = await adminClient
      .from('officer_credentials')
      .select('login_email, password_ciphertext, visible_to_admin')
      .eq('officer_id', officerId)
      .maybeSingle();

    if (credError) throw credError;
    if (!creds) throw new Error('No credentials stored for this officer');
    if (!creds.visible_to_admin) {
      throw new Error('Password viewing is not enabled for this officer');
    }

    const password = await decryptPassword(creds.password_ciphertext as string);

    const { data: { user: adminUser } } = await userClient.auth.getUser();
    await adminClient.from('audit_logs').insert({
      actor_id: adminUser?.id ?? null,
      action: 'officer_password_revealed',
      target_entity: officerId,
      status: 'SUCCESS',
    });

    return new Response(
      JSON.stringify({ loginEmail: creds.login_email, password }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
