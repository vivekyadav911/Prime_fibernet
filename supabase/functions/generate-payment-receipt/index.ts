import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function receiptHtml(payment: Record<string, unknown>, company: Record<string, unknown>): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    body{font-family:Arial,sans-serif;padding:24px;color:#111}
    h1{color:#5B4FE9} table{width:100%;border-collapse:collapse;margin-top:16px}
    td,th{padding:8px;border-bottom:1px solid #eee;text-align:left}
  </style></head><body>
    <h1>${company.company_name ?? 'Prime Fibernet'}</h1>
    <p>${company.company_address ?? ''}</p>
    <p>GSTIN: ${company.company_gstin ?? '—'}</p>
    <h2>Payment Receipt</h2>
    <table>
      <tr><th>Receipt</th><td>${payment.payment_number}</td></tr>
      <tr><th>Customer</th><td>${payment.customer_name}</td></tr>
      <tr><th>Account</th><td>${payment.account_number}</td></tr>
      <tr><th>Plan</th><td>${payment.plan_name ?? '—'}</td></tr>
      <tr><th>Amount</th><td>₹${payment.total_amount}</td></tr>
      <tr><th>Method</th><td>${payment.method}</td></tr>
      <tr><th>Paid At</th><td>${payment.confirmed_at ?? payment.paid_at}</td></tr>
      <tr><th>Next Due</th><td>${payment.next_due_date ?? '—'}</td></tr>
    </table>
  </body></html>`;
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

  try {
    // Identify the caller — every authenticated role (admin or officer) must supply a JWT.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json401('Authorization header required');

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json401('Invalid or expired token');

    const { paymentId } = await req.json();
    if (!paymentId) throw new Error('paymentId required');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve caller role via profiles (uses service role so no RLS interference).
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
      // Officer can only generate receipts for payments they collected.
      const { data: officer } = await supabase
        .from('officers')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (!officer || payment.collected_by !== officer.id) return json403();
    }

    if (payErr || !payment) throw new Error('Payment not found');
    if (payment.status !== 'confirmed') throw new Error('Payment must be confirmed to generate receipt');

    const { data: settings } = await supabase.from('general_settings').select('*').limit(1).maybeSingle();

    const billingPeriod =
      payment.billing_period_start && payment.billing_period_end
        ? `${payment.billing_period_start} – ${payment.billing_period_end}`
        : null;

    const { data: existing } = await supabase
      .from('payment_receipts')
      .select('id, pdf_url, receipt_number')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (existing?.pdf_url) {
      return new Response(JSON.stringify({ url: existing.pdf_url, receiptNumber: existing.receipt_number }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = receiptHtml(payment, settings ?? {});
    const filename = `receipt_${payment.payment_number}.html`;
    await supabase.storage.from('exports').upload(filename, new TextEncoder().encode(html), {
      contentType: 'text/html',
      upsert: true,
    });

    const { data: signed } = await supabase.storage.from('exports').createSignedUrl(filename, 3600);
    const pdfUrl = signed?.signedUrl ?? null;

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

    if (recErr) throw recErr;

    return new Response(
      JSON.stringify({ url: pdfUrl, receiptNumber: receipt.receipt_number, receiptId: receipt.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
