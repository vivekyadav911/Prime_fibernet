import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';
import { razorpayAdapter } from '../_shared/payments/adapters/razorpay.ts';
import { decryptCredentials } from '../_shared/payments/crypto.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const STALE_MS = 15 * 60 * 1000;
const RATE_LIMIT_MS = 200;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const cutoff = new Date(Date.now() - STALE_MS).toISOString();

    const { data: stalePayments, error } = await supabase
      .from('payments')
      .select('id, gateway_order_id, gateway_slug, customer_id, total_amount, created_at')
      .eq('status', 'initiated')
      .lt('created_at', cutoff)
      .not('gateway_order_id', 'like', 'dev_%')
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) throw error;
    if (!stalePayments?.length) {
      return new Response(JSON.stringify({ checked: 0, resolved: 0, failed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: gatewayRow } = await supabase
      .from('payment_gateways')
      .select('credentials, slug')
      .eq('is_default', true)
      .eq('is_active', true)
      .maybeSingle();

    const creds = await decryptCredentials((gatewayRow?.credentials ?? {}) as Record<string, string>);

    let resolved = 0;
    let failed = 0;

    for (const payment of stalePayments) {
      const orderId = String(payment.gateway_order_id ?? '');
      if (!orderId) continue;

      try {
        const captured = await razorpayAdapter.fetchCapturedPayment(creds, orderId);
        if (captured) {
          const { error: invokeErr } = await supabase.functions.invoke('verify-payment', {
            body: {
              paymentId: payment.id,
              orderId,
              gateway: payment.gateway_slug ?? gatewayRow?.slug ?? 'razorpay',
              razorpayPaymentId: captured.paymentId,
              pollOnly: '1',
            },
          });
          if (!invokeErr) resolved += 1;
        } else {
          const now = new Date().toISOString();
          await supabase
            .from('payments')
            .update({
              status: 'failed',
              failure_reason: 'Payment not completed — checkout expired',
              updated_at: now,
            })
            .eq('id', payment.id)
            .eq('status', 'initiated');
          failed += 1;
        }
      } catch (err) {
        console.error(`resolve-stale-payments: ${payment.id}`, err);
      }

      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
    }

    console.log(`resolve-stale-payments: checked=${stalePayments.length} resolved=${resolved} failed=${failed}`);

    return new Response(
      JSON.stringify({ checked: stalePayments.length, resolved, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('resolve-stale-payments error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
