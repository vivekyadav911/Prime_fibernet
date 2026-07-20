import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const DEFAULT_BATCH = 200;
const MAX_BATCH = 500;

type CandidateRow = {
  id: string;
  email: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
};

function displayName(row: CandidateRow): string {
  const joined = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
  return row.name?.trim() || joined || (row.email ?? '').split('@')[0] || 'Customer';
}

function randomPassword(): string {
  // Unusable placeholder; the user claims their account via OTP and sets their own.
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization');

    // Only an authenticated admin may run provisioning.
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

    const body = (await req.json().catch(() => ({}))) as {
      batchSize?: number;
      dryRun?: boolean;
    };
    const batchSize = Math.min(Math.max(body.batchSize ?? DEFAULT_BATCH, 1), MAX_BATCH);
    const dryRun = Boolean(body.dryRun);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Candidates: customers/officers not yet linked to an auth user.
    const { data: candidates, error: selErr } = await admin
      .from('users')
      .select('id, email, name, first_name, last_name, role')
      .in('role', ['customer', 'officer'])
      .is('auth_user_id', null)
      .not('email', 'is', null)
      .limit(batchSize)
      .returns<CandidateRow[]>();
    if (selErr) throw selErr;

    const { count: remainingBefore } = await admin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .in('role', ['customer', 'officer'])
      .is('auth_user_id', null)
      .not('email', 'is', null);

    if (dryRun) {
      return new Response(
        JSON.stringify({ ok: true, dryRun: true, candidates: candidates?.length ?? 0, remaining: remainingBefore ?? 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let created = 0;
    let linkedExisting = 0;
    const failures: Array<{ id: string; email: string | null; error: string }> = [];

    for (const row of candidates ?? []) {
      const email = (row.email ?? '').trim().toLowerCase();
      if (!email) continue;
      try {
        let authUid: string | null = null;

        const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
          email,
          password: randomPassword(),
          email_confirm: true,
          user_metadata: { app_role: row.role ?? 'customer' },
        });

        if (createErr) {
          // Idempotent: an auth user with this email may already exist.
          const { data: existingId, error: lookupErr } = await admin.rpc('auth_user_id_by_email', {
            p_email: email,
          });
          if (lookupErr || !existingId) throw createErr;
          authUid = existingId as string;
          linkedExisting += 1;
        } else {
          authUid = createdUser?.user?.id ?? null;
          if (!authUid) throw new Error('Auth user not created');
          created += 1;
        }

        const { error: linkErr } = await admin
          .from('users')
          .update({ auth_user_id: authUid })
          .eq('id', row.id);
        if (linkErr) throw linkErr;

        if (row.role === 'officer') {
          await admin.from('officers').update({ auth_user_id: authUid }).eq('user_id', row.id);
        }

        const { error: profErr } = await admin.from('profiles').upsert(
          {
            id: authUid,
            email,
            full_name: displayName(row),
            password_set: false,
          },
          { onConflict: 'id' },
        );
        if (profErr) throw profErr;
      } catch (e) {
        failures.push({ id: row.id, email: row.email, error: e instanceof Error ? e.message : String(e) });
      }
    }

    const remaining = Math.max((remainingBefore ?? 0) - created - linkedExisting, 0);

    return new Response(
      JSON.stringify({
        ok: true,
        processed: candidates?.length ?? 0,
        created,
        linkedExisting,
        failed: failures.length,
        failures: failures.slice(0, 25),
        remaining,
      }),
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
