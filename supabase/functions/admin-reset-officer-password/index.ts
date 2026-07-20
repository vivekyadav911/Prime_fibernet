import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';
import { decryptPassword, encryptPassword, generatePassword } from '../_shared/officerCredentials.ts';

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

    const body = (await req.json()) as { officerId?: string; newPassword?: string };
    const { officerId, newPassword } = body;
    if (!officerId) throw new Error('officerId is required');

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: officer } = await adminClient
      .from('officers')
      .select('auth_user_id, user_id, email, full_name')
      .eq('id', officerId)
      .maybeSingle();
    if (!officer) throw new Error('Officer not found');

    // Resolve the officer's real auth account; the stored id may be orphaned
    // (points at no auth.users row), in which case we provision a fresh account
    // so the password is actually settable and the officer can log in.
    const candidateId = (officer.auth_user_id ?? officer.user_id) as string | undefined;
    let realId: string | null = null;
    if (candidateId) {
      const { data: got } = await adminClient.auth.admin.getUserById(candidateId);
      if (got?.user) realId = got.user.id;
    }

    const plainPassword = newPassword && newPassword.length >= 8 ? newPassword : generatePassword();
    const loginEmail = (officer.email as string) ?? '';

    if (realId) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(realId, {
        password: plainPassword,
      });
      if (authError) throw authError;
    } else {
      if (!loginEmail) throw new Error('Set an email for this officer before resetting the password.');
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email: loginEmail,
        email_confirm: true,
        password: plainPassword,
        user_metadata: { role: 'officer', name: officer.full_name ?? null },
      });
      if (createErr || !created?.user) {
        throw new Error(createErr?.message ?? 'Could not create login account');
      }
      realId = created.user.id;
      // officers.user_id is FK -> public.users.id; resolve a valid users row.
      let usersRowId: string | null = null;
      const { data: urow } = await adminClient
        .from('users')
        .select('id')
        .eq('auth_user_id', realId)
        .maybeSingle();
      if (urow?.id) {
        usersRowId = urow.id as string;
      } else {
        const { data: ins } = await adminClient
          .from('users')
          .insert({ auth_user_id: realId, email: loginEmail, name: officer.full_name ?? loginEmail, role: 'officer' })
          .select('id')
          .maybeSingle();
        usersRowId = (ins?.id as string) ?? null;
      }
      // guard_officer_self_update reverts direct service-role updates, so relink
      // the officer's auth identity through the SECURITY DEFINER RPC.
      const { error: relinkErr } = await adminClient.rpc('admin_relink_officer_identity', {
        p_officer_id: officerId,
        p_auth_id: realId,
        p_user_id: usersRowId,
        p_email: loginEmail,
      });
      if (relinkErr) throw new Error(relinkErr.message);
      await adminClient.from('profiles').update({ email: loginEmail }).eq('id', realId);
    }

    const ciphertext = await encryptPassword(plainPassword);

    const { data: existing } = await adminClient
      .from('officer_credentials')
      .select('officer_id, visible_to_admin')
      .eq('officer_id', officerId)
      .maybeSingle();

    if (existing) {
      await adminClient
        .from('officer_credentials')
        .update({
          password_ciphertext: ciphertext,
          rotated_at: new Date().toISOString(),
        })
        .eq('officer_id', officerId);
    } else {
      await adminClient.from('officer_credentials').insert({
        officer_id: officerId,
        login_email: (officer?.email as string) ?? '',
        password_ciphertext: ciphertext,
        visible_to_admin: true,
        password_set_method: 'auto',
      });
    }

    const { data: { user: adminUser } } = await userClient.auth.getUser();
    await adminClient.from('audit_logs').insert({
      actor_id: adminUser?.id ?? null,
      action: 'officer_password_reset',
      target_entity: officerId,
      status: 'SUCCESS',
    });

    return new Response(
      JSON.stringify({
        loginEmail: (officer?.email as string) ?? '',
        password: plainPassword,
        visibleToAdmin: existing?.visible_to_admin ?? true,
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
