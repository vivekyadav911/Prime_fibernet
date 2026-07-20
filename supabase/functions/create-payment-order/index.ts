import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';
import { getAdapter } from '../_shared/payments/adapters/index.ts';
import { resolveRazorpayPublicKey } from '../_shared/payments/adapters/razorpay.ts';
import { decryptCredentials } from '../_shared/payments/crypto.ts';
import type { PaymentMethodType } from '../_shared/payments/types.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ORDER_REUSE_WINDOW_MS = 30 * 60 * 1000;
const MIN_CUSTOM_AMOUNT = 1;
const MAX_CUSTOM_AMOUNT = 50_000;

function gatewayPublicKey(
  gatewaySlug: string,
  creds: Record<string, string>,
  orderPublicKey?: string,
): string {
  if (orderPublicKey) return orderPublicKey;
  if (gatewaySlug === 'razorpay') return resolveRazorpayPublicKey(creds);
  return creds.key_id ?? creds.merchant_key ?? creds.app_id ?? creds.merchant_id ?? '';
}

function mapMethod(raw?: string): PaymentMethodType {
  const m = (raw ?? 'upi').toLowerCase();
  if (m === 'card') return 'card';
  if (m === 'netbanking') return 'netbanking';
  if (m === 'wallet') return 'wallet';
  return 'upi';
}

async function resolveAuthoritativeAmount(
  supabase: ReturnType<typeof createClient>,
  customerId: string,
  clientAmount: number,
  intent: string,
  planId?: string | null,
  customerOutstanding?: number | null,
  recentCutoffIso?: string,
): Promise<{ amount: number; serverDerived: boolean }> {
  // New plan purchase: price is fixed by the selected plan, independent of any
  // outstanding bill or unrelated open payment for this customer.
  if (intent === 'plan') {
    if (planId) {
      const { data: plan } = await supabase.from('plans').select('price').eq('id', planId).maybeSingle();
      if (plan?.price != null && Number(plan.price) > 0) {
        return { amount: Math.round(Number(plan.price) * 100) / 100, serverDerived: true };
      }
    }
    return { amount: Math.round(clientAmount * 100) / 100, serverDerived: false };
  }

  const outstanding = Math.round(Number(customerOutstanding ?? 0) * 100) / 100;
  if (outstanding > 0) return { amount: outstanding, serverDerived: true };

  if (recentCutoffIso) {
    const { data: openPayment } = await supabase
      .from('payments')
      .select('total_amount')
      .eq('customer_id', customerId)
      .in('status', ['initiated', 'pending_review'])
      .gte('created_at', recentCutoffIso)
      .not('gateway_order_id', 'like', 'dev_%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const openAmount = openPayment?.total_amount != null ? Number(openPayment.total_amount) : 0;
    if (openAmount > 0) {
      return { amount: Math.round(openAmount * 100) / 100, serverDerived: true };
    }
  }

  // ponytail: bill/custom with zero outstanding → trust client amount
  if (intent === 'bill' || intent === 'custom') {
    return { amount: Math.round(clientAmount * 100) / 100, serverDerived: false };
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_id, plans!inner(price)')
    .eq('user_id', customerId)
    .eq('status', 'active')
    .order('end_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const subPlan = sub?.plans as { price?: number } | null | undefined;
  if (subPlan?.price != null && Number(subPlan.price) > 0) {
    return { amount: Math.round(Number(subPlan.price) * 100) / 100, serverDerived: true };
  }

  if (planId) {
    const { data: plan } = await supabase.from('plans').select('price').eq('id', planId).maybeSingle();
    if (plan?.price != null && Number(plan.price) > 0) {
      return { amount: Math.round(Number(plan.price) * 100) / 100, serverDerived: true };
    }
  }

  return { amount: Math.round(clientAmount * 100) / 100, serverDerived: false };
}

async function expireStaleInitiatedPayments(
  supabase: ReturnType<typeof createClient>,
  customerId: string,
  cutoffIso: string,
) {
  await supabase
    .from('payments')
    .update({
      status: 'failed',
      failure_reason: 'Checkout expired',
      updated_at: new Date().toISOString(),
    })
    .eq('customer_id', customerId)
    .eq('status', 'initiated')
    .lt('created_at', cutoffIso);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addBillingMonths(start: Date, cycle: string): Date {
  const end = new Date(start);
  const months = cycle === 'quarterly' ? 3 : cycle === 'annual' ? 12 : 1;
  end.setUTCMonth(end.getUTCMonth() + months);
  end.setUTCDate(end.getUTCDate() - 1);
  return end;
}

async function resolveBillingPeriod(
  supabase: ReturnType<typeof createClient>,
  customerId: string,
  intent: string,
  clientStart?: string | null,
  clientEnd?: string | null,
): Promise<{ start: string | null; end: string | null }> {
  if (intent === 'custom') {
    return { start: null, end: null };
  }

  if (intent !== 'advance') {
    return { start: clientStart ?? null, end: clientEnd ?? null };
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('end_at, billing_cycle')
    .eq('user_id', customerId)
    .eq('status', 'active')
    .order('end_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub?.end_at) {
    return { start: clientStart ?? null, end: clientEnd ?? null };
  }

  const nextStart = new Date(String(sub.end_at));
  nextStart.setUTCDate(nextStart.getUTCDate() + 1);
  const nextEnd = addBillingMonths(nextStart, String(sub.billing_cycle ?? 'monthly'));
  return { start: isoDate(nextStart), end: isoDate(nextEnd) };
}

async function isBillingPeriodPaid(
  supabase: ReturnType<typeof createClient>,
  customerId: string,
  billingPeriodStart: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('payments')
    .select('id')
    .eq('customer_id', customerId)
    .eq('status', 'confirmed')
    .eq('billing_period_start', billingPeriodStart)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
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
      intent = 'bill',
      billingPeriodStart,
      billingPeriodEnd,
      dueDate,
    } = body;

    const resolvedCustomerId = customerId ?? userId;
    if (!resolvedCustomerId || !userName || amount == null) {
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
      .select('id, name, phone, customer_id, email, outstanding_amount')
      .eq('id', resolvedCustomerId)
      .maybeSingle();

    const clientAmount = Math.round(Number(amount) * 100) / 100;
    if (intent === 'custom') {
      if (clientAmount < MIN_CUSTOM_AMOUNT || clientAmount > MAX_CUSTOM_AMOUNT) {
        throw new Error(`Amount must be between ₹${MIN_CUSTOM_AMOUNT} and ₹${MAX_CUSTOM_AMOUNT.toLocaleString('en-IN')}.`);
      }
    }
    const recentCutoffIso = new Date(Date.now() - ORDER_REUSE_WINDOW_MS).toISOString();
    const billingPeriod = await resolveBillingPeriod(
      supabase,
      resolvedCustomerId,
      intent,
      billingPeriodStart,
      billingPeriodEnd,
    );

    if ((intent === 'bill' || intent === 'retry' || intent === 'advance') && billingPeriod.start) {
      if (await isBillingPeriodPaid(supabase, resolvedCustomerId, billingPeriod.start)) {
        throw new Error(
          intent === 'advance'
            ? 'The next billing cycle is already paid. Try a custom amount instead.'
            : 'This billing cycle is already paid. Use Pay in Advance for the next cycle.',
        );
      }
    }

    const { amount: authoritativeAmount, serverDerived } = await resolveAuthoritativeAmount(
      supabase,
      resolvedCustomerId,
      clientAmount,
      intent,
      planId ?? null,
      customer?.outstanding_amount,
      recentCutoffIso,
    );

    if (authoritativeAmount <= 0) {
      throw new Error('No amount due. Refresh your bill and try again.');
    }

    if (intent !== 'custom' && intent !== 'advance' && serverDerived && Math.abs(authoritativeAmount - clientAmount) > 1) {
      throw new Error('Amount mismatch. Please refresh and try again.');
    }

    await expireStaleInitiatedPayments(supabase, resolvedCustomerId, recentCutoffIso);

    const { data: existingOrder } = await supabase
      .from('payments')
      .select('id, payment_number, gateway_order_id, total_amount, gateway_slug')
      .eq('customer_id', resolvedCustomerId)
      .eq('status', 'initiated')
      .gte('created_at', recentCutoffIso)
      .eq('total_amount', authoritativeAmount)
      .not('gateway_order_id', 'like', 'dev_%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const adapter = getAdapter(gateway.slug);
    if (!adapter) throw new Error(`Unsupported gateway: ${gateway.slug}`);

    const creds = await decryptCredentials((gateway.credentials ?? {}) as Record<string, string>);

    if (existingOrder?.gateway_order_id) {
      return new Response(
        JSON.stringify({
          success: true,
          paymentId: existingOrder.id,
          paymentNumber: existingOrder.payment_number,
          orderId: existingOrder.gateway_order_id,
          checkoutUrl: null,
          checkoutParams: null,
          gatewaySlug: existingOrder.gateway_slug ?? gateway.slug,
          gateway: existingOrder.gateway_slug ?? gateway.slug,
          keyId: gatewayPublicKey(gateway.slug, creds),
          amount: Number(existingOrder.total_amount),
          planId: planId ?? null,
          reused: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const accountNumber =
      customer?.customer_id?.trim() ||
      `PFN-${String(resolvedCustomerId).replace(/-/g, '').slice(0, 8).toUpperCase()}`;

    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        customer_id: resolvedCustomerId,
        customer_name: userName ?? customer?.name ?? 'Customer',
        customer_phone: userPhone ?? customer?.phone,
        account_number: accountNumber,
        plan_id: planId ?? null,
        plan_name: planName ?? null,
        amount: authoritativeAmount,
        total_amount: authoritativeAmount,
        tax_amount: 0,
        discount_amount: 0,
        method: mapMethod(paymentMethod),
        channel,
        gateway_id: gateway.id,
        gateway_slug: gateway.slug,
        status: 'initiated',
        billing_period_start: billingPeriod.start,
        billing_period_end: billingPeriod.end,
        due_date: dueDate ?? null,
      })
      .select()
      .single();

    if (payErr) throw payErr;

    const order = await adapter.createOrder(creds, {
      paymentId: payment.id,
      amount: authoritativeAmount,
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
        keyId: gatewayPublicKey(
          gateway.slug,
          creds,
          order.publicKey,
        ),
        amount: authoritativeAmount,
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
