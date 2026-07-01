import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

import { corsHeaders } from '../_shared/cors.ts';
import {
  getWhatsAppSettings,
  logWhatsApp,
  renderTemplate,
  resolveRequestUserId,
  sendWhatsAppDocument,
  sendWhatsAppText,
} from '../_shared/whatsapp.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENWA_API_MASTER_KEY = Deno.env.get('OPENWA_API_MASTER_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { payment_id, send_pdf = false, pdf_base64 } = await req.json();
    if (!payment_id) {
      throw new Error('payment_id required');
    }

    const sentBy = await resolveRequestUserId(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      req.headers.get('Authorization'),
    );

    const settings = await getWhatsAppSettings(supabase);
    if (!settings?.enabled || !settings.notify_payment) {
      return new Response(JSON.stringify({ skipped: true, reason: 'disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!settings.gateway_session_id) {
      return new Response(JSON.stringify({ skipped: true, reason: 'missing_session_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, total_amount, receipt_number, customer_name, customer_phone, confirmed_at, created_at')
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      return new Response(JSON.stringify({ error: 'Payment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!payment.customer_phone) {
      await logWhatsApp(supabase, {
        recipient_phone: 'unknown',
        recipient_name: payment.customer_name,
        message_type: 'payment_receipt',
        reference_id: payment_id,
        reference_type: 'payment',
        status: 'skipped',
        error_message: 'Customer has no phone number',
        sent_by: sentBy,
      });

      return new Response(JSON.stringify({ skipped: true, reason: 'missing_phone' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paidAt = payment.confirmed_at ?? payment.created_at ?? new Date().toISOString();
    const receiptNumber = payment.receipt_number ?? payment.id.slice(0, 8).toUpperCase();
    const text = renderTemplate(settings.payment_receipt_template, {
      customer_name: payment.customer_name ?? 'Customer',
      amount: Number(payment.total_amount ?? 0).toLocaleString('en-IN'),
      date: new Date(paidAt).toLocaleDateString('en-IN'),
      receipt_number: receiptNumber,
    });

    const result = await sendWhatsAppText(
      settings.gateway_url,
      OPENWA_API_MASTER_KEY,
      settings.gateway_session_id,
      payment.customer_phone,
      text,
    );

    if (result.success && send_pdf && typeof pdf_base64 === 'string' && pdf_base64.length > 10) {
      await sendWhatsAppDocument(
        settings.gateway_url,
        OPENWA_API_MASTER_KEY,
        settings.gateway_session_id,
        payment.customer_phone,
        pdf_base64,
        `Receipt_${receiptNumber}.pdf`,
        'Your payment receipt is attached.',
      );
    }

    await logWhatsApp(supabase, {
      recipient_phone: payment.customer_phone,
      recipient_name: payment.customer_name,
      message_type: 'payment_receipt',
      reference_id: payment_id,
      reference_type: 'payment',
      status: result.success ? 'sent' : 'failed',
      error_message: result.error ?? null,
      wa_message_id: result.messageId ?? null,
      sent_by: sentBy,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
