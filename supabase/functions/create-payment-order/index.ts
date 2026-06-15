import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';
import { getAdapter } from '../_shared/payments/adapters/index.ts';
import { decryptCredentials } from '../_shared/payments/crypto.ts';
import type { PaymentMethodType } from '../_shared/payments/types.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function mapMethod(raw?: string): PaymentMethodType {
  const m = (raw ?? 'upi').toLowerCase();
  if (m === 'card') return 'card';
  if (m === 'netbanking') return 'netbanking';
  if (m === 'wallet') return 'wallet';
  return 'upi';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      customerId,
      userId,
      userName,
      userEmail,
      userPhone,
      amount,
      planName,
      planId,
      paymentMethod,
      channel = 'online_app',
      billingPeriodStart,
      billingPeriodEnd,
      dueDate,
    } = body;

    const resolvedCustomerId = customerId ?? userId;
    if (!resolvedCustomerId || !userName || !amount) {
      throw new Error('Missing required fields: customerId, userName, amount');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: gateway, error: gwErr } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('is_default', true)
      .eq('is_active', true)
      .maybeSingle();

    if (gwErr) throw gwErr;
    if (!gateway) throw new Error('No active payment gateway configured');

    const { data: customer } = await supabase
      .from('users')
      .select('id, name, phone, customer_id, email')
      .eq('id', resolvedCustomerId)
      .maybeSingle();

    const adapter = getAdapter(gateway.slug);
    if (!adapter) throw new Error(`Unsupported gateway: ${gateway.slug}`);

    const creds = await decryptCredentials((gateway.credentials ?? {}) as Record<string, string>);

    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        customer_id: resolvedCustomerId,
        customer_name: userName ?? customer?.name ?? 'Customer',
        customer_phone: userPhone ?? customer?.phone,
        account_number: customer?.customer_id ?? `ACC-${String(resolvedCustomerId).slice(0, 8)}`,
        plan_name: planName ?? null,
        amount,
        total_amount: amount,
        tax_amount: 0,
        discount_amount: 0,
        method: mapMethod(paymentMethod),
        channel,
        gateway_id: gateway.id,
        gateway_slug: gateway.slug,
        status: 'initiated',
        billing_period_start: billingPeriodStart ?? null,
        billing_period_end: billingPeriodEnd ?? null,
        due_date: dueDate ?? null,
      })
      .select()
      .single();

    if (payErr) throw payErr;

    const order = await adapter.createOrder(creds, {
      paymentId: payment.id,
      amount: Number(amount),
      customerId: resolvedCustomerId,
      customerName: userName,
      customerEmail: userEmail ?? customer?.email ?? 'customer@primefibernet.com',
      customerPhone: userPhone ?? customer?.phone ?? '',
      planName: planName ?? 'Broadband Bill',
      accountNumber: payment.account_number,
      webhookBaseUrl: SUPABASE_URL,
    });

    await supabase
      .from('payments')
      .update({ gateway_order_id: order.orderId })
      .eq('id', payment.id);

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: payment.id,
        paymentNumber: payment.payment_number,
        orderId: order.orderId,
        checkoutUrl: order.checkoutUrl ?? null,
        checkoutParams: order.checkoutParams ?? null,
        gatewaySlug: gateway.slug,
        gateway: gateway.slug,
        keyId: order.publicKey ?? creds.key_id ?? creds.merchant_key ?? creds.app_id ?? creds.merchant_id,
        amount: Number(amount),
        planId: planId ?? null,
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
