import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function receiptStoragePath(paymentNumber: string): string {
  return `receipt_${paymentNumber}.html`;
}

function receiptHtml(payment: Record<string, unknown>, company: Record<string, unknown>): string {
  const receiptNumber = escapeHtml(payment.payment_number);
  const paidAt = payment.confirmed_at ?? payment.paid_at ?? payment.created_at;
  const formattedDate = paidAt
    ? new Date(String(paidAt)).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
    : '—';
  const methodLabel = escapeHtml(String(payment.method ?? 'Online')).replace(/_/g, ' ').toUpperCase();
  const amount = Number(payment.total_amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const companyName = escapeHtml(company.company_name ?? 'Prime Fibernet');
  const companyAddress = escapeHtml(company.company_address ?? '');
  const companyGstin = escapeHtml(company.company_gstin ?? '—');
  const txnId = escapeHtml(payment.gateway_payment_id ?? payment.gateway_txn_id ?? '—');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt ${receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f8faff;
      padding: 24px;
      color: #1a1f36;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      padding: 32px;
      max-width: 480px;
      margin: 0 auto;
      box-shadow: 0 4px 24px rgba(61,82,213,0.08);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 2px solid #f0f2ff;
    }
    .brand { font-size: 20px; font-weight: 800; color: #3D52D5; }
    .brand-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
    .paid-badge {
      background: #dcfce7;
      color: #16a34a;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .receipt-title { font-size: 13px; color: #94a3b8; font-weight: 600; letter-spacing: 1px; margin-bottom: 6px; }
    .receipt-number { font-size: 22px; font-weight: 800; color: #1a1f36; margin-bottom: 24px; }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #f0f2ff;
    }
    .row:last-of-type { border-bottom: none; }
    .row-label { font-size: 13px; color: #64748b; }
    .row-value { font-size: 13px; font-weight: 600; color: #1a1f36; text-align: right; max-width: 55%; }
    .amount-row {
      background: #f0f2ff;
      border-radius: 10px;
      padding: 16px;
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .amount-label { font-size: 14px; font-weight: 700; color: #3D52D5; }
    .amount-value { font-size: 26px; font-weight: 900; color: #3D52D5; }
    .footer {
      text-align: center;
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid #f0f2ff;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.6;
    }
    .txn-id { font-family: monospace; font-size: 11px; color: #94a3b8; word-break: break-all; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div class="brand">${companyName}</div>
        <div class="brand-sub">www.primefiber.net</div>
      </div>
      <div class="paid-badge">PAID</div>
    </div>
    <div class="receipt-title">PAYMENT RECEIPT</div>
    <div class="receipt-number">${receiptNumber}</div>
    <div class="row"><span class="row-label">Date</span><span class="row-value">${formattedDate}</span></div>
    <div class="row"><span class="row-label">Customer</span><span class="row-value">${escapeHtml(payment.customer_name)}</span></div>
    <div class="row"><span class="row-label">Account ID</span><span class="row-value">${escapeHtml(payment.account_number)}</span></div>
    <div class="row"><span class="row-label">Service</span><span class="row-value">${escapeHtml(payment.plan_name ?? 'Broadband Internet')}</span></div>
    <div class="row"><span class="row-label">Payment Method</span><span class="row-value">${methodLabel}</span></div>
    <div class="row"><span class="row-label">Transaction ID</span><span class="row-value txn-id">${txnId}</span></div>
    <div class="amount-row">
      <span class="amount-label">Total Paid</span>
      <span class="amount-value">₹${amount}</span>
    </div>
    <div class="footer">
      This is a computer-generated receipt and does not require a signature.<br>
      ${companyAddress ? `${companyAddress}<br>` : ''}
      GSTIN: ${companyGstin}
    </div>
  </div>
</body>
</html>`;
}

async function createFreshSignedUrl(
  supabase: ReturnType<typeof createClient>,
  storagePath: string,
): Promise<string | null> {
  const { data: signed, error } = await supabase.storage
    .from('exports')
    .createSignedUrl(storagePath, 3600);
  if (error) {
    console.error('Signed URL error:', storagePath, error.message);
    return null;
  }
  return signed?.signedUrl ?? null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json401 = (msg: string) =>
    new Response(JSON.stringify({ error: msg }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  const json403 = () =>
    new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  const jsonError = (msg: string, status = 400) =>
    new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json401('Authorization header required');

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json401('Invalid or expired token');

    let body: { paymentId?: string };
    try {
      body = await req.json();
    } catch {
      return jsonError('Invalid request body');
    }

    const { paymentId } = body;
    if (!paymentId) return jsonError('paymentId required');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const callerIsAdmin = profile?.role === 'admin';
    const callerIsCustomer = profile?.role === 'customer';

    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (!payErr && payment && callerIsCustomer) {
      const { data: customerUserId, error: cidErr } = await userClient.rpc('current_customer_user_id');
      if (cidErr || !customerUserId || payment.customer_id !== customerUserId) return json403();
    } else if (!payErr && payment && !callerIsAdmin && !callerIsCustomer) {
      const { data: officer } = await supabase
        .from('officers')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (!officer || payment.collected_by !== officer.id) return json403();
    }

    if (payErr || !payment) {
      console.error('Payment fetch error:', payErr?.message);
      return jsonError('Payment not found', 404);
    }

    if (payment.status !== 'confirmed') {
      return jsonError(`Receipt only available for confirmed payments. Current status: ${payment.status}`);
    }

    const { data: linkedInvoice } = await supabase
      .from('invoices')
      .select('id, pdf_storage_path, invoice_number')
      .eq('portal_payment_id', paymentId)
      .maybeSingle();

    if (linkedInvoice?.pdf_storage_path) {
      const { data: signed } = await supabase.storage
        .from('invoices')
        .createSignedUrl(linkedInvoice.pdf_storage_path, 3600);
      if (signed?.signedUrl) {
        return new Response(
          JSON.stringify({
            url: signed.signedUrl,
            receiptNumber: linkedInvoice.invoice_number ?? payment.payment_number,
            source: 'invoice_pdf',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    if (linkedInvoice?.id) {
      const { data: genData, error: genErr } = await supabase.functions.invoke('invoice-generator', {
        body: { invoiceId: linkedInvoice.id },
      });
      const genUrl = (genData as { url?: string })?.url;
      if (!genErr && genUrl) {
        return new Response(
          JSON.stringify({
            url: genUrl,
            receiptNumber: linkedInvoice.invoice_number ?? payment.payment_number,
            source: 'generated_invoice',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const { data: settings } = await supabase.from('general_settings').select('*').limit(1).maybeSingle();

    const billingPeriod =
      payment.billing_period_start && payment.billing_period_end
        ? `${payment.billing_period_start} – ${payment.billing_period_end}`
        : null;

    const storagePath = receiptStoragePath(String(payment.payment_number));

    const { data: existing } = await supabase
      .from('payment_receipts')
      .select('id, receipt_number')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (existing) {
      const freshUrl = await createFreshSignedUrl(supabase, storagePath);
      if (freshUrl) {
        await supabase
          .from('payment_receipts')
          .update({ pdf_url: freshUrl })
          .eq('payment_id', paymentId);
        return new Response(
          JSON.stringify({ url: freshUrl, receiptNumber: existing.receipt_number, receiptId: existing.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const html = receiptHtml(payment, settings ?? {});
    const { error: uploadError } = await supabase.storage.from('exports').upload(
      storagePath,
      new TextEncoder().encode(html),
      {
        contentType: 'text/html; charset=utf-8',
        upsert: true,
      },
    );

    if (uploadError) {
      console.error('Storage upload error:', uploadError.message);
      return jsonError('Could not store receipt file', 500);
    }

    const pdfUrl = await createFreshSignedUrl(supabase, storagePath);
    if (!pdfUrl) return jsonError('Could not generate download link', 500);

    const { data: receipt, error: recErr } = await supabase
      .from('payment_receipts')
      .upsert({
        payment_id: paymentId,
        customer_id: payment.customer_id,
        customer_name: payment.customer_name,
        account_number: payment.account_number,
        amount: payment.amount,
        tax_amount: payment.tax_amount,
        total_amount: payment.total_amount,
        payment_method: payment.method,
        payment_date: payment.confirmed_at ?? payment.paid_at ?? new Date().toISOString(),
        billing_period: billingPeriod,
        next_due_date: payment.next_due_date,
        company_name: settings?.company_name ?? 'Prime Fibernet',
        company_address: settings?.company_address,
        company_gstin: settings?.company_gstin,
        pdf_url: pdfUrl,
      }, { onConflict: 'payment_id' })
      .select()
      .single();

    if (recErr) {
      console.error('Receipt upsert error:', recErr.message);
      throw recErr;
    }

    return new Response(
      JSON.stringify({ url: pdfUrl, receiptNumber: receipt.receipt_number, receiptId: receipt.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('generate-payment-receipt unhandled error:', error);
    return jsonError('Could not generate receipt', 500);
  }
});
