import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';
import { razorpayAdapter } from '../_shared/payments/adapters/razorpay.ts';
import { decryptCredentials } from '../_shared/payments/crypto.ts';
import {
  getWhatsAppSettings,
  logWhatsApp,
  renderTemplate,
  sendWhatsAppText,
} from '../_shared/whatsapp.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENWA_API_MASTER_KEY = Deno.env.get('OPENWA_API_MASTER_KEY')!;

type BillingCycle = 'monthly' | 'quarterly' | 'annual';

function cycleDays(cycle: BillingCycle): number {
  if (cycle === 'quarterly') return 90;
  if (cycle === 'annual') return 365;
  return 30;
}

function mapRazorpayMethod(method: string): string {
  const m = method.toLowerCase();
  if (m === 'card') return 'card';
  if (m === 'netbanking') return 'netbanking';
  if (m === 'wallet') return 'wallet';
  return 'upi';
}

async function sendActivationWhatsApp(params: {
  supabase: ReturnType<typeof createClient>;
  customerName: string | null;
  customerPhone: string | null;
  planName: string | null;
  referenceId: string;
}) {
  const settings = await getWhatsAppSettings(params.supabase);
  if (!settings?.enabled || !settings.notify_activations || !settings.gateway_session_id) {
    return;
  }

  if (!params.customerPhone) {
    await logWhatsApp(params.supabase, {
      recipient_phone: 'unknown',
      recipient_name: params.customerName,
      message_type: 'activation',
      reference_id: params.referenceId,
      reference_type: 'subscription',
      status: 'skipped',
      error_message: 'Customer has no phone number',
    });
    return;
  }

  const text = renderTemplate(settings.activation_template, {
    customer_name: params.customerName ?? 'Customer',
    plan_name: params.planName ?? 'Active plan',
  });

  const result = await sendWhatsAppText(
    settings.gateway_url,
    OPENWA_API_MASTER_KEY,
    settings.gateway_session_id,
    params.customerPhone,
    text,
  );

  await logWhatsApp(params.supabase, {
    recipient_phone: params.customerPhone,
    recipient_name: params.customerName,
    message_type: 'activation',
    reference_id: params.referenceId,
    reference_type: 'subscription',
    status: result.success ? 'sent' : 'failed',
    error_message: result.error ?? null,
    wa_message_id: result.messageId ?? null,
  });
}

async function confirmPortalPayment(params: {
  supabase: ReturnType<typeof createClient>;
  portalPayment: Record<string, unknown>;
  paymentId: string;
  orderId?: string;
  gateway?: string;
  gatewayPaymentId?: string;
  method?: string;
  billingCycle?: BillingCycle;
  planId?: string | null;
}) {
  const {
    supabase,
    portalPayment,
    paymentId,
    orderId,
    gateway,
    gatewayPaymentId,
    method,
    billingCycle = 'monthly',
    planId,
  } = params;

  const paidAt = new Date().toISOString();
  await supabase
    .from('payments')
    .update({
      status: 'confirmed',
      gateway_order_id: orderId ?? (portalPayment.gateway_order_id as string | null),
      gateway_payment_id: gatewayPaymentId ?? (portalPayment.gateway_payment_id as string | null),
      gateway_slug: gateway ?? (portalPayment.gateway_slug as string | null),
      method: method ? mapRazorpayMethod(method) : (portalPayment.method as string | undefined),
      paid_at: paidAt,
      confirmed_at: paidAt,
      verification_method: 'webhook',
    })
    .eq('id', paymentId);

  const billingPeriodStart = portalPayment.billing_period_start as string | null | undefined;
  if (billingPeriodStart) {
    await supabase
      .from('payments')
      .update({
        status: 'cancelled',
        failure_reason: 'Superseded by successful payment',
        updated_at: paidAt,
      })
      .eq('customer_id', portalPayment.customer_id as string)
      .in('status', ['initiated', 'pending_review'])
      .eq('billing_period_start', billingPeriodStart)
      .neq('id', paymentId);
  }

  await supabase
    .from('payments')
    .update({
      status: 'failed',
      failure_reason: 'Superseded by successful payment',
      updated_at: paidAt,
    })
    .eq('customer_id', portalPayment.customer_id as string)
    .eq('status', 'initiated')
    .neq('id', paymentId);

  const resolvedPlanId = planId ?? null;
  if (resolvedPlanId) {
    const { data: plan } = await supabase
      .from('plans')
      .select('name, speed_mbps, validity_days')
      .eq('id', resolvedPlanId)
      .maybeSingle();
    const days = cycleDays(billingCycle);
    const start = new Date();
    const end = new Date(start.getTime() + days * 86400000);
    await supabase.from('subscriptions').insert({
      user_id: portalPayment.customer_id,
      plan_id: resolvedPlanId,
      plan_name: plan?.name ?? portalPayment.plan_name,
      speed_mbps: plan?.speed_mbps ?? null,
      amount_paid: portalPayment.total_amount,
      billing_cycle: billingCycle,
      start_at: start.toISOString().slice(0, 10),
      end_at: end.toISOString().slice(0, 10),
      status: 'active',
      auto_renew: true,
    });

    await sendActivationWhatsApp({
      supabase,
      customerName: (portalPayment.customer_name as string | null | undefined) ?? null,
      customerPhone: (portalPayment.customer_phone as string | null | undefined) ?? null,
      planName: (plan?.name as string | null | undefined) ?? (portalPayment.plan_name as string | null | undefined) ?? null,
      referenceId: String(portalPayment.customer_id),
    });
  }

  const { data: customerAuth } = await supabase
    .from('users')
    .select('auth_user_id')
    .eq('id', portalPayment.customer_id as string)
    .maybeSingle();

  if (customerAuth?.auth_user_id) {
    await supabase.from('portal_notifications').insert({
      recipient_auth_id: customerAuth.auth_user_id,
      type: 'payment_success',
      category: 'payment',
      title: 'Payment received',
      body: `Payment of ₹${portalPayment.total_amount} received for ${portalPayment.plan_name ?? 'your plan'}`,
      action_url: '/customer/payments',
      data: { payment_id: paymentId },
    });
  }

  await syncPortalInvoice({ supabase, portalPayment, paymentId, paidAt });
}

async function syncPortalInvoice(params: {
  supabase: ReturnType<typeof createClient>;
  portalPayment: Record<string, unknown>;
  paymentId: string;
  paidAt: string;
}): Promise<void> {
  const { supabase, portalPayment, paymentId, paidAt } = params;
  const { data: gs } = await supabase.from('general_settings').select('feature_auto_invoice').limit(1).maybeSingle();
  if (gs?.feature_auto_invoice === false) return;

  const customerId = String(portalPayment.customer_id);
  const amount = Number(portalPayment.total_amount ?? 0);

  const { data: linked } = await supabase
    .from('invoices')
    .select('id')
    .eq('portal_payment_id', paymentId)
    .maybeSingle();

  let invoiceId = linked?.id as string | undefined;

  if (!invoiceId) {
    const { data: matched } = await supabase
      .from('invoices')
      .select('id')
      .eq('user_id', customerId)
      .in('status', ['unpaid', 'pending', 'overdue', 'draft'])
      .or(`subtotal.eq.${amount},total_amount.eq.${amount},amount.eq.${amount}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    invoiceId = matched?.id as string | undefined;
  }

  if (invoiceId) {
    await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: paidAt,
        portal_payment_id: paymentId,
        updated_at: paidAt,
      })
      .eq('id', invoiceId);
  } else {
    const gst = Math.round(amount * 0.18 * 100) / 100;
    const { data: numRow } = await supabase.rpc('generate_invoice_number');
    const { data: inserted } = await supabase
      .from('invoices')
      .insert({
        user_id: customerId,
        portal_payment_id: paymentId,
        invoice_number: numRow ?? `INV-${Date.now()}`,
        invoice_type: 'gst',
        delivery_status: 'pending',
        customer_name: (portalPayment.customer_name as string | null) ?? 'Customer',
        customer_email: (portalPayment.customer_email_snapshot as string | null) ?? null,
        customer_phone: (portalPayment.customer_phone as string | null) ?? null,
        amount: amount + gst,
        subtotal: amount,
        gst_amount: gst,
        cgst_amount: gst / 2,
        sgst_amount: gst / 2,
        total_amount: amount + gst,
        line_items: [{
          description: portalPayment.plan_name
            ? `Internet service — ${portalPayment.plan_name}`
            : 'Internet service',
          hsn_sac: '998422',
          quantity: 1,
          unit: 'Nos',
          unit_price: amount,
          gst_rate: 18,
        }],
        status: 'paid',
        paid_at: paidAt,
        issue_date: paidAt.slice(0, 10),
      })
      .select('id')
      .single();
    invoiceId = inserted?.id as string | undefined;
  }

  if (invoiceId) {
    await supabase.functions.invoke('invoice-generator', { body: { invoiceId } });
  }

  await supabase.functions.invoke('generate-payment-receipt', { body: { paymentId } });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const body = req.method === 'GET' ? Object.fromEntries(url.searchParams) : await req.json();
    const {
      paymentId,
      orderId,
      gateway,
      dev,
      billingCycle = 'monthly',
      planId,
      razorpayPaymentId,
      razorpaySignature,
      pollOnly,
    } = body as Record<string, string>;

    if (!paymentId && !orderId) throw new Error('paymentId or orderId required');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let portalPayment: Record<string, unknown> | null = null;
    if (paymentId) {
      const { data, error: portalErr } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .maybeSingle();
      if (!portalErr && data) portalPayment = data as Record<string, unknown>;
    } else if (orderId) {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('gateway_order_id', orderId)
        .maybeSingle();
      if (data) portalPayment = data as Record<string, unknown>;
    }

    if (portalPayment) {
      const resolvedPaymentId = String(portalPayment.id);
      const resolvedOrderId = orderId ?? String(portalPayment.gateway_order_id ?? '');
      const gatewaySlug = gateway ?? String(portalPayment.gateway_slug ?? 'razorpay');

      if (portalPayment.status === 'confirmed') {
        return new Response(JSON.stringify({ success: true, alreadyVerified: true, status: 'confirmed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: gatewayRow } = await supabase
        .from('payment_gateways')
        .select('credentials')
        .eq('slug', gatewaySlug)
        .maybeSingle();
      const creds = await decryptCredentials((gatewayRow?.credentials ?? {}) as Record<string, string>);

      let gatewayPaymentId = razorpayPaymentId ?? '';
      let method = 'upi';
      let verified = false;

      if (gatewaySlug === 'razorpay' && razorpayPaymentId && razorpaySignature && resolvedOrderId) {
        verified = await razorpayAdapter.verifyPaymentSignature(
          creds,
          resolvedOrderId,
          razorpayPaymentId,
          razorpaySignature,
        );
        if (!verified && dev !== '1') {
          throw new Error('Payment signature verification failed');
        }
        gatewayPaymentId = razorpayPaymentId;
        verified = true;
      } else if (gatewaySlug === 'razorpay' && resolvedOrderId && (pollOnly === '1' || pollOnly === 'true' || !razorpayPaymentId)) {
        let captured: { paymentId: string; method: string } | null = null;
        for (let i = 0; i < 3; i += 1) {
          captured = await razorpayAdapter.fetchCapturedPayment(creds, resolvedOrderId);
          if (captured) break;
          await new Promise((r) => setTimeout(r, 2000));
        }
        if (!captured) {
          return new Response(
            JSON.stringify({ success: false, status: 'pending', verified: false }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        gatewayPaymentId = captured.paymentId;
        method = captured.method;
        verified = true;
      } else if (dev === '1') {
        verified = true;
      } else if (!pollOnly && gatewaySlug !== 'razorpay') {
        verified = true;
      } else if (!pollOnly && gatewaySlug === 'razorpay' && !razorpayPaymentId) {
        throw new Error('razorpayPaymentId and razorpaySignature required for Razorpay verification');
      }

      if (!verified) {
        return new Response(
          JSON.stringify({ success: false, status: 'pending', verified: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      await confirmPortalPayment({
        supabase,
        portalPayment,
        paymentId: resolvedPaymentId,
        orderId: resolvedOrderId,
        gateway: gatewaySlug,
        gatewayPaymentId,
        method,
        billingCycle: billingCycle as BillingCycle,
        planId: planId ?? null,
      });

      return new Response(
        JSON.stringify({ success: true, verified: true, status: 'confirmed', subscription_id: planId ?? null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!paymentId) throw new Error('Payment not found');

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

      await sendActivationWhatsApp({
        supabase,
        customerName: (payment.user_name as string | null | undefined) ?? null,
        customerPhone: (payment.user_phone as string | null | undefined) ?? null,
        planName: (payment.plan_name as string | null | undefined) ?? null,
        referenceId: String(payment.user_id),
      });
    }

    if (dev === '1') {
      console.log('Dev mode payment verified');
    }

    await supabase.functions.invoke('invoice-generator', { body: { paymentId } });

    const { data: gs } = await supabase.from('general_settings').select('feature_auto_invoice').limit(1).maybeSingle();
    if (gs?.feature_auto_invoice !== false) {
      const amount = Number(payment.amount ?? 0);
      const gst = Math.round(amount * 0.18 * 100) / 100;
      const { data: numRow } = await supabase.rpc('generate_invoice_number');
      await supabase.from('invoices').insert({
        user_id: payment.user_id,
        payment_id: paymentId,
        invoice_number: numRow ?? `INV-${Date.now()}`,
        invoice_type: 'gst',
        delivery_status: 'pending',
        customer_name: payment.user_name ?? 'Customer',
        customer_email: payment.user_email ?? null,
        customer_phone: payment.user_phone ?? null,
        amount,
        subtotal: amount,
        gst_amount: gst,
        cgst_amount: gst / 2,
        sgst_amount: gst / 2,
        total_amount: amount + gst,
        line_items: [{
          description: payment.plan_name ? `Internet service — ${payment.plan_name}` : 'Internet service',
          hsn_sac: '998422',
          quantity: 1,
          unit: 'Nos',
          unit_price: amount,
          gst_rate: 18,
        }],
        status: 'paid',
        issue_date: new Date().toISOString().slice(0, 10),
      });
    }

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
