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
    const { invoice_id, pdf_base64 } = await req.json();
    if (!invoice_id) throw new Error('invoice_id required');

    const sentBy = await resolveRequestUserId(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      req.headers.get('Authorization'),
    );

    const settings = await getWhatsAppSettings(supabase);
    if (!settings?.enabled || !settings.notify_invoice) {
      return new Response(JSON.stringify({ skipped: true, reason: 'disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!settings.gateway_session_id) {
      return new Response(JSON.stringify({ skipped: true, reason: 'missing_session_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, invoice_number, total_amount, due_date, customer_name, customer_phone, recipient_phone')
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const phone = invoice.recipient_phone ?? invoice.customer_phone;
    if (!phone) {
      await logWhatsApp(supabase, {
        recipient_phone: 'unknown',
        recipient_name: invoice.customer_name,
        message_type: 'invoice',
        reference_id: invoice_id,
        reference_type: 'invoice',
        status: 'skipped',
        error_message: 'Invoice recipient has no phone number',
        sent_by: sentBy,
      });

      return new Response(JSON.stringify({ skipped: true, reason: 'missing_phone' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const invoiceNumber = invoice.invoice_number ?? invoice.id.slice(0, 8).toUpperCase();
    const text = renderTemplate(settings.invoice_template, {
      customer_name: invoice.customer_name ?? 'Customer',
      invoice_number: invoiceNumber,
      amount: Number(invoice.total_amount ?? 0).toLocaleString('en-IN'),
      due_date: invoice.due_date
        ? new Date(invoice.due_date).toLocaleDateString('en-IN')
        : 'N/A',
    });

    const result = await sendWhatsAppText(
      settings.gateway_url,
      OPENWA_API_MASTER_KEY,
      settings.gateway_session_id,
      phone,
      text,
    );

    if (result.success && typeof pdf_base64 === 'string' && pdf_base64.length > 10) {
      await sendWhatsAppDocument(
        settings.gateway_url,
        OPENWA_API_MASTER_KEY,
        settings.gateway_session_id,
        phone,
        pdf_base64,
        `Invoice_${invoiceNumber}.pdf`,
        'Your invoice is attached.',
      );
    }

    await logWhatsApp(supabase, {
      recipient_phone: phone,
      recipient_name: invoice.customer_name,
      message_type: 'invoice',
      reference_id: invoice_id,
      reference_type: 'invoice',
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
