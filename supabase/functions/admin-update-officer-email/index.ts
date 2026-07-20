import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';
import { encryptPassword, generatePassword } from '../_shared/officerCredentials.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// deno-lint-ignore no-explicit-any
type AdminClient = any;

function mapEmailError(message: string): string {
  return /already|exists|registered|duplicate/i.test(message)
    ? 'That email is already in use by another account.'
    : message;
}

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

    const body = (await req.json()) as { officerId?: string; newEmail?: string };
    const officerId = body.officerId?.trim();
    const newEmail = body.newEmail?.trim().toLowerCase();
    if (!officerId) throw new Error('officerId is required');
    if (!newEmail || !EMAIL_RE.test(newEmail)) throw new Error('A valid newEmail is required');

    const adminClient: AdminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: officer } = await adminClient
      .from('officers')
      .select('auth_user_id, user_id, email, full_name')
      .eq('id', officerId)
      .maybeSingle();
    if (!officer) throw new Error('Officer not found');

    // Resolve the officer's real auth account, if any. The stored id can be
    // stale/orphaned (points at no auth.users row), so verify it exists.
    const candidateId = (officer.auth_user_id ?? officer.user_id) as string | undefined;
    let realId: string | null = null;
    if (candidateId) {
      const { data: got } = await adminClient.auth.admin.getUserById(candidateId);
      if (got?.user) realId = got.user.id;
    }

    let provisioned = false;
    let generatedPassword: string | null = null;
    let usersRowId: string | null = null;

    if (realId) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(realId, {
        email: newEmail,
        email_confirm: true,
      });
      if (authError) throw new Error(mapEmailError(authError.message));
    } else {
      // No real auth account — provision one so the officer can actually log in
      // and be managed. A temporary password is generated and returned.
      generatedPassword = generatePassword();
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email: newEmail,
        email_confirm: true,
        password: generatedPassword,
        user_metadata: { role: 'officer', name: officer.full_name ?? null },
      });
      if (createErr || !created?.user) {
        throw new Error(mapEmailError(createErr?.message ?? 'Could not create login account'));
      }
      realId = created.user.id;
      provisioned = true;

      // officers.user_id is FK -> public.users.id, so resolve a valid users row.
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
          .insert({ auth_user_id: realId, email: newEmail, name: officer.full_name ?? newEmail, role: 'officer' })
          .select('id')
          .maybeSingle();
        usersRowId = (ins?.id as string) ?? null;
      }
    }

    // Mirror the email (and relink the auth account) across the app tables.
    // The officers write must go through the RPC because guard_officer_self_update
    // reverts direct service-role updates to everything but name/phone/photo.
    const { error: relinkErr } = await adminClient.rpc('admin_relink_officer_identity', {
      p_officer_id: officerId,
      p_auth_id: realId,
      p_user_id: usersRowId,
      p_email: newEmail,
    });
    if (relinkErr) throw new Error(relinkErr.message);
    await adminClient.from('users').update({ email: newEmail }).eq('auth_user_id', realId);
    await adminClient.from('profiles').update({ email: newEmail }).eq('id', realId);

    if (provisioned && generatedPassword) {
      const ciphertext = await encryptPassword(generatedPassword);
      const { data: existingCred } = await adminClient
        .from('officer_credentials')
        .select('officer_id')
        .eq('officer_id', officerId)
        .maybeSingle();
      if (existingCred) {
        await adminClient
          .from('officer_credentials')
          .update({
            login_email: newEmail,
            password_ciphertext: ciphertext,
            password_set_method: 'auto',
            visible_to_admin: true,
            rotated_at: new Date().toISOString(),
          })
          .eq('officer_id', officerId);
      } else {
        await adminClient.from('officer_credentials').insert({
          officer_id: officerId,
          login_email: newEmail,
          password_ciphertext: ciphertext,
          visible_to_admin: true,
          password_set_method: 'auto',
        });
      }
    } else {
      await adminClient
        .from('officer_credentials')
        .update({ login_email: newEmail })
        .eq('officer_id', officerId);
    }

    const {
      data: { user: adminUser },
    } = await userClient.auth.getUser();
    await adminClient.from('audit_logs').insert({
      actor_id: adminUser?.id ?? null,
      action: provisioned ? 'officer_login_provisioned' : 'officer_email_updated',
      target_entity: officerId,
      status: 'SUCCESS',
      metadata: { new_email: newEmail, provisioned },
    });

    return new Response(JSON.stringify({ loginEmail: newEmail, provisioned, generatedPassword }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
