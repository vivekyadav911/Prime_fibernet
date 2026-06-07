import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { paymentId, amount, reason } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: payment } = await supabase.from('user_payments').select('*').eq('id', paymentId).single();
    if (!payment) throw new Error('Payment not found');

    await supabase
      .from('user_payments')
      .update({
        payment_status: 'refunded',
        refund_amount: amount ?? payment.amount,
        notes: reason,
      })
      .eq('id', paymentId);

    await supabase.from('audit_logs').insert({
      action: 'payment_refund',
      target_entity: 'user_payments',
      new_values: { paymentId, amount, reason },
      status: 'SUCCESS',
    });

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
