import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';
import { getAdapter } from '../_shared/payments/adapters/index.ts';
import { decryptCredentials } from '../_shared/payments/crypto.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const gatewaySlug = url.searchParams.get('gateway');
  if (!gatewaySlug) {
    return new Response(JSON.stringify({ error: 'Missing gateway query param' }), { status: 400 });
  }

  const bodyText = await req.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    const params = new URLSearchParams(bodyText);
    payload = Object.fromEntries(params.entries());
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const adapter = getAdapter(gatewaySlug);
  if (!adapter) {
    return new Response(JSON.stringify({ error: 'Unknown gateway' }), { status: 400 });
  }

  const { data: gateway } = await supabase
    .from('payment_gateways')
    .select('credentials')
    .eq('slug', gatewaySlug)
    .maybeSingle();

  const creds = await decryptCredentials((gateway?.credentials ?? {}) as Record<string, string>);
  const result = await adapter.verifyWebhook(creds, bodyText, req.headers, payload);

  if (!result.verified) {
    return new Response('Signature verification failed', { status: 400 });
  }

  const { data: existing } = await supabase
    .from('payments')
    .select('id, status')
    .eq('gateway_order_id', result.orderId)
    .maybeSingle();

  if (!existing) {
    return new Response(JSON.stringify({ error: 'Payment not found' }), { status: 404 });
  }

  if (existing.status === 'pending_review' || existing.status === 'confirmed') {
    return new Response(JSON.stringify({ received: true, skipped: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (result.status === 'failed') {
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        gateway_payment_id: result.gatewayPaymentId,
        gateway_signature: result.signature,
        gateway_raw_response: result.raw,
        failure_reason: 'Gateway reported failure',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  await supabase
    .from('payments')
    .update({
      status: 'pending_review',
      gateway_payment_id: result.gatewayPaymentId,
      gateway_signature: result.signature,
      gateway_raw_response: result.raw,
      method: result.method ?? 'upi',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id);

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
