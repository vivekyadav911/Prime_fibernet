import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type Filters = {
  status?: string;
  method?: string;
  channel?: string;
  gateway_slug?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

async function fetchPayments(supabase: ReturnType<typeof createClient>, filters: Filters) {
  let query = supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5000);

  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.method && filters.method !== 'all') query = query.eq('method', filters.method);
  if (filters.channel && filters.channel !== 'all') query = query.eq('channel', filters.channel);
  if (filters.gateway_slug && filters.gateway_slug !== 'all') {
    query = query.eq('gateway_slug', filters.gateway_slug);
  }
  if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
  if (filters.dateTo) query = query.lte('created_at', filters.dateTo);
  if (filters.search?.trim()) {
    const q = `%${filters.search.trim()}%`;
    query = query.or(`payment_number.ilike.${q},customer_name.ilike.${q},account_number.ilike.${q}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: isAdmin } = await userClient.rpc('is_admin_user');
    if (!isAdmin) throw new Error('Admin access required');

    const { filters = {}, format = 'xlsx' } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const payments = await fetchPayments(supabase, filters as Filters);

    const rows = payments.map((p) => ({
      'Payment No.': p.payment_number,
      'Date & Time': p.created_at,
      'Customer Name': p.customer_name,
      'Account No.': p.account_number,
      Plan: p.plan_name,
      Amount: p.amount,
      Tax: p.tax_amount,
      Total: p.total_amount,
      Method: p.method,
      Channel: p.channel,
      Gateway: p.gateway_slug,
      'Gateway Payment ID': p.gateway_payment_id,
      Status: p.status,
      'Confirmed At': p.confirmed_at,
      'Next Due Date': p.next_due_date,
      'Review Notes': p.review_notes,
    }));

    const filename = `payments_export_${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'All Payments');

      const confirmed = payments.filter((p) => p.status === 'confirmed');
      const summary = [{
        'Total Collected': confirmed.reduce((s, p) => s + Number(p.total_amount), 0),
        'Pending Review': payments.filter((p) => p.status === 'pending_review').length,
        'Cash Pending': payments.filter((p) => p.status === 'cash_collected').length,
        Failed: payments.filter((p) => p.status === 'failed').length,
      }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary');

      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      await supabase.storage.from('exports').upload(filename, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
      });
    } else {
      const html = `<html><body><h1>Payments Export</h1><table border="1"><tr>${Object.keys(rows[0] ?? { col: '' }).map((k) => `<th>${k}</th>`).join('')}</tr>${rows.map((r) => `<tr>${Object.values(r).map((v) => `<td>${v ?? ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      await supabase.storage.from('exports').upload(filename, new TextEncoder().encode(html), {
        contentType: 'application/pdf',
        upsert: true,
      });
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from('exports')
      .createSignedUrl(filename, 300);

    if (signErr) throw signErr;

    return new Response(JSON.stringify({ url: signed.signedUrl, filename }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
