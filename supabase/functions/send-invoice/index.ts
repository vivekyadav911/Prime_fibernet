import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';
import {
  buildInvoiceEmailHtml,
  mapDbLineItems,
  resolveEmailFromAddress,
} from '../_shared/invoiceHtml.ts';
import {
  getWhatsAppSettings,
  logWhatsApp,
  sendWhatsAppDocument,
  sendWhatsAppText,
} from '../_shared/whatsapp.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const OPENWA_API_MASTER_KEY = Deno.env.get('OPENWA_API_MASTER_KEY')!;

type SendBody = {
  invoiceId: string;
  channel: 'email' | 'whatsapp';
  recipientEmail?: string;
  recipientPhone?: string;
};

async function sendEmailViaResend(
  to: string,
  subject: string,
  html: string,
  from: string,
): Promise<void> {
  if (!RESEND_API_KEY) {
    throw new Error('EMAIL_NOT_CONFIGURED: Set RESEND_API_KEY or download PDF and share manually');
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Email send failed: ${err}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader ?? '' } },
    });
    const { data: authData } = await userClient.auth.getUser();
    const senderId = authData.user?.id ?? null;

    const body = (await req.json()) as SendBody;
    const { invoiceId, channel, recipientEmail, recipientPhone } = body;
    if (!invoiceId || !channel) throw new Error('invoiceId and channel required');

    const { data: invoice, error } = await supabase.from('invoices').select('*').eq('id', invoiceId).single();
    if (error || !invoice) throw new Error('Invoice not found');

    const recipient =
      channel === 'email'
        ? recipientEmail ?? invoice.recipient_email ?? invoice.customer_email
        : recipientPhone ?? invoice.recipient_phone ?? invoice.customer_phone;

    if (!recipient) throw new Error(`No ${channel} recipient on file`);

    let pdfUrl: string | null = null;
    if (invoice.pdf_storage_path) {
      const { data: signed } = await supabase.storage
        .from('invoices')
        .createSignedUrl(invoice.pdf_storage_path, 604800);
      pdfUrl = signed?.signedUrl ?? null;
    }

    if (!pdfUrl) {
      const { data: genData, error: genErr } = await supabase.functions.invoke('invoice-generator', {
        body: { invoiceId },
      });
      if (!genErr) {
        pdfUrl = (genData as { url?: string })?.url ?? null;
      }
    }

    if (channel === 'whatsapp') {
      const settings = await getWhatsAppSettings(supabase);
      if (!settings?.enabled || !settings.notify_invoice || !settings.gateway_session_id) {
        throw new Error('WHATSAPP_NOT_CONFIGURED: Configure OpenWA in WhatsApp Integration settings first');
      }

      const phone = String(recipient).trim();
      const amount = Number(invoice.total_amount ?? invoice.amount ?? 0).toLocaleString('en-IN');
      const dueDate = invoice.due_date
        ? new Date(invoice.due_date).toLocaleDateString('en-IN')
        : 'N/A';
      const text = settings.invoice_template
        .replaceAll('{{customer_name}}', String(invoice.customer_name ?? 'Customer'))
        .replaceAll('{{invoice_number}}', String(invoice.invoice_number ?? invoice.id))
        .replaceAll('{{amount}}', amount)
        .replaceAll('{{due_date}}', dueDate);

      const textResult = await sendWhatsAppText(
        settings.gateway_url,
        OPENWA_API_MASTER_KEY,
        settings.gateway_session_id,
        phone,
        text,
      );

      if (!textResult.success) {
        await logWhatsApp(supabase, {
          recipient_phone: phone,
          recipient_name: invoice.customer_name,
          message_type: 'invoice',
          reference_id: invoiceId,
          reference_type: 'invoice',
          status: 'failed',
          error_message: textResult.error ?? 'Unknown WhatsApp send failure',
          wa_message_id: textResult.messageId ?? null,
          sent_by: senderId,
        });
        throw new Error(textResult.error ?? 'Failed to send WhatsApp invoice');
      }

      if (pdfUrl) {
        const pdfResponse = await fetch(pdfUrl);
        if (pdfResponse.ok) {
          const bytes = new Uint8Array(await pdfResponse.arrayBuffer());
          let binary = '';
          for (let index = 0; index < bytes.length; index += 1) {
            binary += String.fromCharCode(bytes[index]!);
          }
          const base64 = btoa(binary);
          await sendWhatsAppDocument(
            settings.gateway_url,
            OPENWA_API_MASTER_KEY,
            settings.gateway_session_id,
            phone,
            base64,
            `Invoice_${invoice.invoice_number ?? invoice.id}.pdf`,
            'Your invoice is attached.',
          );
        }
      }

      await supabase
        .from('invoices')
        .update({
          delivery_status: 'sent',
          delivery_channel: 'whatsapp',
          sent_at: new Date().toISOString(),
          sent_to: phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      await supabase.from('invoice_history').insert({
        invoice_id: invoiceId,
        user_id: invoice.user_id,
        invoice_number: invoice.invoice_number,
        amount: invoice.total_amount ?? invoice.amount,
        status: 'sent',
        channel: 'whatsapp',
        recipient: phone,
        sent_by: senderId,
        pdf_url: pdfUrl,
        metadata: { invoiceId, waMessageId: textResult.messageId ?? null },
      });

      await logWhatsApp(supabase, {
        recipient_phone: phone,
        recipient_name: invoice.customer_name,
        message_type: 'invoice',
        reference_id: invoiceId,
        reference_type: 'invoice',
        status: 'sent',
        wa_message_id: textResult.messageId ?? null,
        sent_by: senderId,
      });

      return new Response(JSON.stringify({ ok: true, sentTo: phone }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: company } = await supabase.from('general_settings').select('*').limit(1).maybeSingle();
    const fromAddress = resolveEmailFromAddress(company ?? {});
    const subject = `Invoice ${invoice.invoice_number} — ${company?.company_name ?? 'Prime Fibernet'}`;
    const lineItems = mapDbLineItems(invoice.line_items as Record<string, unknown>[] | undefined);
    const html = buildInvoiceEmailHtml({
      customerName: String(invoice.customer_name ?? 'Customer'),
      invoiceNumber: String(invoice.invoice_number ?? invoice.id),
      totalAmount: Number(invoice.total_amount ?? invoice.amount ?? 0),
      status: String(invoice.status ?? 'unpaid'),
      dueDate: invoice.due_date as string | null | undefined,
      pdfUrl,
      lineItems,
      companyName: String(company?.company_name ?? 'Prime Fibernet'),
      companyEmail: 'support@primefiber.net',
    });

    await sendEmailViaResend(recipient, subject, html, fromAddress);

    const sentTo = recipient;
    await supabase
      .from('invoices')
      .update({
        delivery_status: 'sent',
        delivery_channel: 'email',
        sent_at: new Date().toISOString(),
        sent_to: sentTo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    await supabase.from('invoice_history').insert({
      invoice_id: invoiceId,
      user_id: invoice.user_id,
      invoice_number: invoice.invoice_number,
      amount: invoice.total_amount ?? invoice.amount,
      status: 'sent',
      channel: 'email',
      recipient: sentTo,
      sent_by: senderId,
      pdf_url: pdfUrl,
      metadata: { invoiceId },
    });

    return new Response(JSON.stringify({ ok: true, sentTo }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
