import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';
import { getAdapter } from '../_shared/payments/adapters/index.ts';
import { decryptCredentials, encryptCredentials, maskCredential } from '../_shared/payments/crypto.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const SECRET_FIELDS: Record<string, string[]> = {
  razorpay: ['key_secret', 'webhook_secret'],
  easebuzz: ['salt'],
  payu: ['salt', 'auth_header'],
  cashfree: ['secret_key'],
  paytm: ['merchant_key'],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: isAdmin } = await supabase.rpc('is_admin_user');
    if (!isAdmin) throw new Error('Admin access required');

    const body = await req.json();
    const { gatewayId, credentials, testOnly, activate, setDefault, testMode } = body;

    if (!gatewayId) throw new Error('gatewayId required');

    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: gateway, error: fetchErr } = await service
      .from('payment_gateways')
      .select('*')
      .eq('id', gatewayId)
      .single();

    if (fetchErr || !gateway) throw new Error('Gateway not found');

    const adapter = getAdapter(gateway.slug);
    if (!adapter) throw new Error('Unsupported gateway');

    const existingCreds = (gateway.credentials ?? {}) as Record<string, string>;
    const decrypted = await decryptCredentials(existingCreds).catch(() => ({} as Record<string, string>));
    const merged: Record<string, string> = { ...decrypted };

    if (credentials && typeof credentials === 'object') {
      for (const [key, value] of Object.entries(credentials as Record<string, string>)) {
        if (value && !value.startsWith('••')) merged[key] = value;
      }
    }

    if (testOnly) {
      const test = await adapter.testConnection(merged);
      return new Response(JSON.stringify(test), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const encrypted = await encryptCredentials(merged);
    const webhookUrl = `${SUPABASE_URL}/functions/v1/payment-webhook?gateway=${gateway.slug}`;

    const updates: Record<string, unknown> = {
      credentials: encrypted,
      webhook_url: webhookUrl,
      updated_at: new Date().toISOString(),
    };
    if (typeof testMode === 'boolean') updates.test_mode = testMode;
    if (activate === true) updates.is_active = true;
    if (setDefault === true) updates.is_default = true;

    const { error: updateErr } = await service
      .from('payment_gateways')
      .update(updates)
      .eq('id', gatewayId);

    if (updateErr) throw updateErr;

    const masked: Record<string, string> = {};
    for (const [key, value] of Object.entries(merged)) {
      const isSecret = (SECRET_FIELDS[gateway.slug] ?? []).includes(key);
      masked[key] = isSecret ? maskCredential(value) : value;
    }

    return new Response(
      JSON.stringify({ success: true, webhookUrl, credentials: masked }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
