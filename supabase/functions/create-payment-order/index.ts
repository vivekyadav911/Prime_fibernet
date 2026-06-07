import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';
import { encode as base64Encode } from 'https://deno.land/std@0.224.0/encoding/base64.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EASYBUZZ_MERCHANT_ID = Deno.env.get('EASYBUZZ_MERCHANT_ID') ?? '';
const EASYBUZZ_API_KEY = Deno.env.get('EASYBUZZ_API_KEY') ?? '';
const EASYBUZZ_SECRET_KEY = Deno.env.get('EASYBUZZ_SECRET_KEY') ?? '';
const EASYBUZZ_API_BASE_URL = Deno.env.get('EASYBUZZ_API_BASE_URL') || 'https://api.easybuzz.in/v1';
const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';

async function getActiveGateway(supabase: ReturnType<typeof createClient>): Promise<'easybuzz' | 'razorpay'> {
  const { data } = await supabase.from('general_settings').select('payment_gateway').limit(1).maybeSingle();
  return (data?.payment_gateway as 'easybuzz' | 'razorpay') ?? 'easybuzz';
}

async function createEasyBuzzOrder(
  paymentId: string,
  amount: number,
  userName: string,
  userEmail: string,
  userPhone: string,
  planName: string,
  planId: string,
  userId: string,
) {
  if (!EASYBUZZ_MERCHANT_ID) {
    return {
      orderId: `dev_easybuzz_${paymentId}`,
      checkoutUrl: `${SUPABASE_URL}/functions/v1/verify-payment?dev=1&paymentId=${paymentId}`,
    };
  }
  const authString = `${EASYBUZZ_MERCHANT_ID}:${EASYBUZZ_API_KEY}:${EASYBUZZ_SECRET_KEY}`;
  const authBase64 = base64Encode(authString);
  const orderPayload = {
    merchant_id: EASYBUZZ_MERCHANT_ID,
    amount: amount.toFixed(2),
    currency: 'INR',
    order_id: `payment_${paymentId}`,
    customer_name: userName,
    customer_email: userEmail,
    customer_phone: userPhone,
    notify_url: `${SUPABASE_URL}/functions/v1/payment-webhook-handler`,
    description: `Payment for ${planName || 'Prime Fibernet'}`,
    metadata: { payment_id: paymentId, user_id: userId, plan_id: planId },
  };
  const orderResponse = await fetch(`${EASYBUZZ_API_BASE_URL}/orders/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authBase64}`,
      'X-Merchant-ID': EASYBUZZ_MERCHANT_ID,
      'X-API-Key': EASYBUZZ_API_KEY,
    },
    body: JSON.stringify(orderPayload),
  });
  if (!orderResponse.ok) throw new Error(`EasyBuzz order creation failed: ${await orderResponse.text()}`);
  const orderData = await orderResponse.json();
  return {
    orderId: orderData.order_id || orderData.transaction_id,
    checkoutUrl: orderData.payment_url || orderData.redirect_url,
  };
}

async function createRazorpayOrder(paymentId: string, amount: number) {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return {
      orderId: `dev_razorpay_${paymentId}`,
      checkoutUrl: `${SUPABASE_URL}/functions/v1/verify-payment?dev=1&paymentId=${paymentId}`,
    };
  }
  const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: Math.round(amount * 100), currency: 'INR', receipt: paymentId }),
  });
  if (!res.ok) throw new Error(`Razorpay order failed: ${await res.text()}`);
  const order = await res.json();
  return {
    orderId: order.id,
    checkoutUrl: `https://checkout.razorpay.com/v1/checkout.js?order_id=${order.id}`,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { userId, userName, userEmail, userPhone, amount, planName, planId } = await req.json();

    if (!userId || !userName || !amount) {
      throw new Error('Missing required fields: userId, userName, amount');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const gateway = await getActiveGateway(supabase);

    const { data: paymentData, error: paymentError } = await supabase
      .from('user_payments')
      .insert({
        user_id: userId,
        amount,
        payment_method: gateway,
        payment_status: 'pending',
        plan_id: planId ?? null,
        gateway,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    const order =
      gateway === 'razorpay'
        ? await createRazorpayOrder(paymentData.id, Number(amount))
        : await createEasyBuzzOrder(
            paymentData.id,
            Number(amount),
            userName,
            userEmail ?? '',
            userPhone ?? '',
            planName ?? '',
            planId ?? '',
            userId,
          );

    await supabase
      .from('user_payments')
      .update({ transaction_id: order.orderId })
      .eq('id', paymentData.id);

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentData.id,
        orderId: order.orderId,
        checkoutUrl: order.checkoutUrl,
        paymentUrl: order.checkoutUrl,
        gateway,
        amount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
