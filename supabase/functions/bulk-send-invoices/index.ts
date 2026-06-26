import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

type BulkBody = {
  invoiceType: 'non_gst' | 'gst';
  channel: 'email' | 'whatsapp';
  invoiceIds?: string[];
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as BulkBody;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let query = supabase
      .from('invoices')
      .select('id, invoice_number, customer_email, recipient_email, customer_phone, recipient_phone, delivery_status, invoice_type')
      .eq('delivery_status', 'pending');

    if (body.invoiceType === 'non_gst') {
      query = query.eq('invoice_type', 'non_gst');
    } else {
      query = query.in('invoice_type', ['gst', 'custom_gst']);
    }

    if (body.invoiceIds?.length) {
      query = query.in('id', body.invoiceIds);
    }

    const { data: invoices, error } = await query.limit(100);
    if (error) throw error;

    const results = { sent: 0, failed: 0, errors: [] as { invoiceId: string; message: string }[] };

    for (const inv of invoices ?? []) {
      try {
        const fnRes = await fetch(`${SUPABASE_URL}/functions/v1/send-invoice`, {
          method: 'POST',
          headers: {
            Authorization: req.headers.get('Authorization') ?? `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            invoiceId: inv.id,
            channel: body.channel,
            recipientEmail: inv.recipient_email ?? inv.customer_email,
            recipientPhone: inv.recipient_phone ?? inv.customer_phone,
          }),
        });
        if (!fnRes.ok) {
          const errBody = await fnRes.json();
          throw new Error(String(errBody.error ?? 'Send failed'));
        }
        results.sent += 1;
      } catch (e) {
        results.failed += 1;
        results.errors.push({ invoiceId: inv.id, message: (e as Error).message });
      }
    }

    if (!RESEND_API_KEY && body.channel === 'email' && results.sent === 0 && (invoices?.length ?? 0) > 0) {
      throw new Error('EMAIL_NOT_CONFIGURED: Set RESEND_API_KEY or send invoices individually after download');
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message, sent: 0, failed: 0, errors: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
