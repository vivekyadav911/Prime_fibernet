import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

type CreateCustomerBody = {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  planId: string;
  status: 'active' | 'inactive' | 'blocked';
  address: string;
  city: string;
  district: string;
  pincode: string;
  state: string;
  expiryDate: string;
};

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

function joinName(first: string, middle: string | undefined, last: string): string {
  return [first, middle, last].filter((p) => p && p.trim()).join(' ').trim();
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
    const { data: { user: adminAuthUser } } = await userClient.auth.getUser();
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as CreateCustomerBody;
    const {
      firstName,
      middleName,
      lastName,
      email,
      phone,
      username,
      planId,
      status,
      address,
      city,
      district,
      pincode,
      state,
      expiryDate,
    } = body;

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !phone?.trim()) {
      throw new Error('firstName, lastName, email, and phone are required');
    }
    if (!username?.trim() || !planId?.trim() || !expiryDate?.trim()) {
      throw new Error('username, planId, and expiryDate are required');
    }
    if (!address?.trim() || !city?.trim() || !district?.trim() || !pincode?.trim() || !state?.trim()) {
      throw new Error('address, city, district, pincode, and state are required');
    }

    const fullName = joinName(firstName.trim(), middleName?.trim(), lastName.trim());
    const normalizedEmail = email.trim().toLowerCase();
    const tempPassword = generateTempPassword();

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: existingEmail } = await adminClient
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (existingEmail) throw new Error('A user with this email already exists');

    const { data: existingUsername } = await adminClient
      .from('users')
      .select('id')
      .eq('username', username.trim())
      .maybeSingle();
    if (existingUsername) throw new Error('This username is already taken');

    const { data: plan } = await adminClient
      .from('plans')
      .select('id')
      .eq('id', planId)
      .eq('is_active', true)
      .maybeSingle();
    if (!plan) throw new Error('Selected plan is not available');

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: fullName,
        phone: phone.trim(),
        role: 'customer',
        app_role: 'customer',
      },
    });

    if (createError) throw createError;
    if (!created?.user?.id) throw new Error('Auth user not created');

    const authUid = created.user.id;
    const today = new Date().toISOString().slice(0, 10);

    try {
      const { error: updateError } = await adminClient
        .from('users')
        .update({
          name: fullName,
          first_name: firstName.trim(),
          middle_name: middleName?.trim() || null,
          last_name: lastName.trim(),
          phone: phone.trim(),
          username: username.trim(),
          address: address.trim(),
          city: city.trim(),
          district: district.trim(),
          pincode: pincode.trim(),
          state: state.trim(),
          expiry_date: expiryDate,
          is_blocked: status === 'inactive' || status === 'blocked',
          auth_user_id: authUid,
          role: 'customer',
        })
        .eq('id', authUid);

      if (updateError) throw updateError;

      const { error: subError } = await adminClient.from('subscriptions').insert({
        user_id: authUid,
        plan_id: planId,
        start_at: today,
        end_at: expiryDate,
        status: 'active',
      });

      if (subError) throw subError;

      const { data: planRow } = await adminClient
        .from('plans')
        .select('name, display_name, speed_mbps')
        .eq('id', planId)
        .maybeSingle();
      const planName = String(planRow?.display_name || planRow?.name || 'your plan');
      const speedMbps = planRow?.speed_mbps ? String(planRow.speed_mbps) : '';

      await adminClient.from('broadcast_notifications').insert({
        title: 'Welcome to Prime Fibernet!',
        message: `Hi ${fullName}, your ${planName} connection is now active${speedMbps ? `! Enjoy ${speedMbps} Mbps internet` : '!'}`,
        priority: 'Normal',
        event_type: 'welcomeMessage',
        status: 'sent',
        audience_type: 'specific_users',
        audience_user_ids: [authUid],
        audience_user_names: [fullName],
        audience_estimated_count: 1,
        total_targeted: 1,
        is_draft: false,
        is_auto_generated: true,
        sent_at: new Date().toISOString(),
        created_by_id: adminAuthUser?.id ?? 'system',
        created_by_name: adminAuthUser?.email ?? 'System',
        tags: ['auto', 'welcome'],
        timezone: 'Asia/Kolkata',
      });

      const { data: tokenRow } = await adminClient
        .from('user_fcm_tokens')
        .select('token')
        .eq('user_id', authUid)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (tokenRow?.token) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: tokenRow.token,
            title: 'Welcome to Prime Fibernet!',
            body: `Hi ${fullName}, your ${planName} connection is now active!`,
            priority: 'default',
            sound: 'default',
          }),
        });
      }

      await adminClient.from('audit_logs').insert({
        actor_id: adminAuthUser?.id ?? null,
        action: 'customer_created',
        target_entity: authUid,
        new_values: { email: normalizedEmail, username: username.trim(), plan_id: planId },
        status: 'SUCCESS',
      });
    } catch (dbError) {
      await adminClient.auth.admin.deleteUser(authUid);
      throw dbError;
    }

    return new Response(
      JSON.stringify({ userId: authUid }),
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
