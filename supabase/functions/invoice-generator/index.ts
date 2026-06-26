import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function invoiceHtml(
  invoice: Record<string, unknown>,
  company: Record<string, unknown>,
): string {
  const lineItems = (invoice.line_items as Record<string, unknown>[]) ?? [];
  const showGst = invoice.invoice_type !== 'non_gst';
  const rows = lineItems
    .map((item, idx) => {
      const qty = Number(item.quantity ?? 1);
      const price = Number(item.unit_price ?? 0);
      const gstRate = Number(item.gst_rate ?? 0);
      const sub = qty * price;
      const gst = showGst ? sub * (gstRate / 100) : 0;
      return `<tr>
        <td>${idx + 1}</td>
        <td>${item.description ?? ''}</td>
        <td>${item.hsn_sac ?? '—'}</td>
        <td>${qty}</td>
        <td>${item.unit ?? 'Nos'}</td>
        <td>₹${sub.toFixed(2)}</td>
        ${showGst ? `<td>₹${gst.toFixed(2)}</td>` : ''}
        <td>₹${(sub + gst).toFixed(2)}</td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    body{font-family:Arial,sans-serif;padding:24px;color:#111;font-size:12px}
    h1{color:#1e40af} table{width:100%;border-collapse:collapse;margin-top:12px}
    th{background:#1e40af;color:#fff;padding:8px;text-align:left}
    td,th{border:1px solid #e2e8f0;padding:6px}
    .totals{margin-top:12px;text-align:right}
  </style></head><body>
    <h1>${company.company_name ?? 'Prime Fibernet'}</h1>
    <p>${company.company_address ?? ''}<br/>GSTIN: ${company.company_gstin ?? '—'}</p>
    <h2>${showGst ? 'TAX INVOICE' : 'INVOICE'} — ${invoice.invoice_number}</h2>
    <p><strong>Bill To:</strong> ${invoice.customer_name}<br/>
    ${invoice.billing_address ?? ''}<br/>
    ${invoice.customer_email ?? ''}</p>
    <table>
      <thead><tr><th>#</th><th>Item</th><th>HSN</th><th>Qty</th><th>Unit</th><th>Price</th>
      ${showGst ? '<th>GST</th>' : ''}<th>Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <p>Subtotal: ₹${Number(invoice.subtotal ?? 0).toFixed(2)}</p>
      ${showGst ? `<p>CGST: ₹${Number(invoice.cgst_amount ?? 0).toFixed(2)} | SGST: ₹${Number(invoice.sgst_amount ?? 0).toFixed(2)}</p>` : ''}
      <p><strong>Total: ₹${Number(invoice.total_amount ?? invoice.amount ?? 0).toFixed(2)}</strong></p>
    </div>
  </body></html>`;
}

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

      const html = invoiceHtml(invoice, settings ?? {});
      const path = `${invoice.user_id ?? 'manual'}/${invoiceId}.html`;
      await supabase.storage.from('invoices').upload(path, new TextEncoder().encode(html), {
        contentType: 'text/html',
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
    const html = `<!DOCTYPE html><html><body><h1>Invoice ${invoiceNumber}</h1><p>Amount: ₹${payment.amount}</p></body></html>`;
    const path = `${payment.user_id}/${paymentId}.html`;
    await supabase.storage.from('invoices').upload(path, new TextEncoder().encode(html), {
      contentType: 'text/html',
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
