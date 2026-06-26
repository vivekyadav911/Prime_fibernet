import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

type OnboardingPatch = Record<string, unknown>;

type RequestBody = {
  action: 'save';
  officerId?: string;
  patch?: OnboardingPatch;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function mergeOnboardingData(
  prev: Record<string, unknown>,
  patch: OnboardingPatch,
): Record<string, unknown> {
  const next = { ...prev };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      next[key] = value;
    }
  }
  return next;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization');

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: isAdmin, error: rpcError } = await userClient.rpc('is_admin_user');
    if (rpcError) throw rpcError;
    if (!isAdmin) return json({ error: 'Forbidden' }, 403);

    const { data: { user: adminUser } } = await userClient.auth.getUser();

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = (await req.json()) as RequestBody;
    const { action, officerId, patch } = body;

    if (action !== 'save') throw new Error('Unknown action');
    if (!officerId) throw new Error('officerId is required');
    if (!patch || typeof patch !== 'object') throw new Error('patch is required');

    const { data: existing, error: fetchError } = await adminClient
      .from('officer_onboarding')
      .select('id, data')
      .eq('officer_id', officerId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const prev =
      existing?.data && typeof existing.data === 'object' && !Array.isArray(existing.data)
        ? (existing.data as Record<string, unknown>)
        : {};
    const nextData = mergeOnboardingData(prev, patch);

    if (existing?.id) {
      const { error } = await adminClient
        .from('officer_onboarding')
        .update({ data: nextData, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await adminClient.from('officer_onboarding').insert({
        officer_id: officerId,
        data: nextData,
        status: 'completed',
      });
      if (error) throw error;
    }

    await adminClient.from('audit_logs').insert({
      actor_id: adminUser?.id ?? null,
      action: 'officer_onboarding_updated',
      target_entity: officerId,
      status: 'SUCCESS',
    });

    return json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 400);
  }
});
