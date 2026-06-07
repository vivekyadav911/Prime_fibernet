import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const body = req.method === 'GET' ? Object.fromEntries(url.searchParams) : await req.json();
    const { paymentId, orderId, gateway, dev } = body as Record<string, string>;

    if (!paymentId) throw new Error('paymentId required');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: payment, error } = await supabase
      .from('user_payments')
      .select('*, users(id)')
      .eq('id', paymentId)
      .single();

    if (error || !payment) throw new Error('Payment not found');

    if (payment.payment_status === 'success') {
      return new Response(JSON.stringify({ success: true, alreadyVerified: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase
      .from('user_payments')
      .update({
        payment_status: 'success',
        transaction_id: orderId ?? payment.transaction_id,
        gateway: gateway ?? payment.gateway,
      })
      .eq('id', paymentId);

    if (payment.plan_id) {
      const { data: plan } = await supabase.from('plans').select('validity_days').eq('id', payment.plan_id).single();
      const days = plan?.validity_days ?? 30;
      const start = new Date();
      const end = new Date(start.getTime() + days * 86400000);
      await supabase.from('subscriptions').insert({
        user_id: payment.user_id,
        plan_id: payment.plan_id,
        start_at: start.toISOString().slice(0, 10),
        end_at: end.toISOString().slice(0, 10),
        status: 'active',
      });
    }

    if (dev === '1') {
      console.log('Dev mode payment verified');
    }

    await supabase.functions.invoke('invoice-generator', { body: { paymentId } });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
