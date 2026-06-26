import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

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

    if (channel === 'whatsapp') {
      const { data: settings } = await supabase.from('general_settings').select('feature_whatsapp').limit(1).maybeSingle();
      if (!settings?.feature_whatsapp) {
        throw new Error(
          'WHATSAPP_NOT_CONFIGURED: Enable WhatsApp in Settings or download the PDF and share from your device',
        );
      }
      throw new Error(
        'WHATSAPP_NOT_CONFIGURED: Download the PDF from invoice history and share via your device',
      );
    }

    const { data: company } = await supabase.from('general_settings').select('*').limit(1).maybeSingle();
    const fromAddress = company?.smtp_user ?? company?.company_email ?? 'billing@primefiber.net';
    const subject = `Invoice ${invoice.invoice_number} — ${company?.company_name ?? 'Prime Fibernet'}`;
    const html = `
      <p>Dear ${invoice.customer_name},</p>
      <p>Please find your invoice <strong>${invoice.invoice_number}</strong> for
      <strong>₹${Number(invoice.total_amount ?? invoice.amount).toFixed(2)}</strong>.</p>
      ${pdfUrl ? `<p><a href="${pdfUrl}">Download invoice PDF</a></p>` : '<p>PDF is being generated — contact support if the link is missing.</p>'}
      <p>Regards,<br/>${company?.company_name ?? 'Prime Fibernet'}</p>`;

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
