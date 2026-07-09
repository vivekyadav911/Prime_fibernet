import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';
import { buildInvoiceHtmlFromDb } from '../_shared/invoiceHtml.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const invoiceId = body.invoiceId as string | undefined;
    const paymentId = body.paymentId as string | undefined;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: settings } = await supabase.from('general_settings').select('*').limit(1).maybeSingle();

    if (invoiceId) {
      const { data: invoice, error } = await supabase.from('invoices').select('*').eq('id', invoiceId).single();
      if (error || !invoice) throw new Error('Invoice not found');

      if (invoice.pdf_storage_path) {
        const { data: signed } = await supabase.storage
          .from('invoices')
          .createSignedUrl(invoice.pdf_storage_path, 604800);
        return new Response(
          JSON.stringify({ url: signed?.signedUrl, invoiceNumber: invoice.invoice_number }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const html = buildInvoiceHtmlFromDb(invoice, settings ?? {});
      const path = `${invoice.user_id ?? 'manual'}/${invoiceId}.html`;
      await supabase.storage.from('invoices').upload(path, new TextEncoder().encode(html), {
        contentType: 'text/html; charset=utf-8',
        upsert: true,
      });
      const { data: signed } = await supabase.storage.from('invoices').createSignedUrl(path, 604800);
      await supabase.from('invoices').update({ pdf_storage_path: path }).eq('id', invoiceId);

      return new Response(
        JSON.stringify({ url: signed?.signedUrl, invoiceNumber: invoice.invoice_number }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!paymentId) throw new Error('invoiceId or paymentId required');

    const { data: payment } = await supabase.from('user_payments').select('*').eq('id', paymentId).single();
    if (!payment) throw new Error('Payment not found');

    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(paymentId).slice(0, 8).toUpperCase()}`;
    const html = buildInvoiceHtmlFromDb({
      invoice_number: invoiceNumber,
      invoice_type: 'gst',
      customer_name: payment.user_name ?? 'Customer',
      customer_email: payment.user_email,
      subtotal: payment.amount,
      total_amount: payment.amount,
      amount: payment.amount,
      status: 'paid',
      line_items: [{
        description: payment.plan_name ? `Internet service — ${payment.plan_name}` : 'Internet service',
        hsn_sac: '998422',
        quantity: 1,
        unit: 'Nos',
        unit_price: payment.amount,
        gst_rate: 0,
      }],
      created_at: new Date().toISOString(),
    }, settings ?? {});
    const path = `${payment.user_id}/${paymentId}.html`;
    await supabase.storage.from('invoices').upload(path, new TextEncoder().encode(html), {
      contentType: 'text/html; charset=utf-8',
      upsert: true,
    });
    const { data: signed } = await supabase.storage.from('invoices').createSignedUrl(path, 604800);
    await supabase.from('user_payments').update({ invoice_url: signed?.signedUrl ?? path }).eq('id', paymentId);

    return new Response(JSON.stringify({ url: signed?.signedUrl, invoiceNumber }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
