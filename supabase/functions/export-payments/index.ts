import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PAGE_SIZE = 1000;
const MAX_ROWS = 100_000;

type Filters = {
  status?: string;
  method?: string;
  channel?: string;
  gateway_slug?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

type PaymentRow = Record<string, unknown> & {
  id: string;
  created_at: string;
  payment_number?: string;
  customer_name?: string;
  account_number?: string;
  plan_name?: string;
  amount?: number;
  tax_amount?: number;
  total_amount?: number;
  method?: string;
  channel?: string;
  gateway_slug?: string;
  gateway_payment_id?: string;
  status?: string;
  confirmed_at?: string;
  next_due_date?: string;
  review_notes?: string;
};

function exportTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + 'Z';
}

function applyFilters(query: ReturnType<ReturnType<typeof createClient>['from']> extends never ? never : any, filters: Filters) {
  let q = query;
  if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
  if (filters.method && filters.method !== 'all') q = q.eq('method', filters.method);
  if (filters.channel && filters.channel !== 'all') q = q.eq('channel', filters.channel);
  if (filters.gateway_slug && filters.gateway_slug !== 'all') {
    q = q.eq('gateway_slug', filters.gateway_slug);
  }
  if (filters.dateFrom) q = q.gte('created_at', filters.dateFrom);
  if (filters.dateTo) q = q.lte('created_at', filters.dateTo);
  if (filters.search?.trim()) {
    const term = filters.search.trim().replace(/[%_,]/g, '');
    const qterm = `%${term}%`;
    q = q.or(`payment_number.ilike.${qterm},customer_name.ilike.${qterm},account_number.ilike.${qterm}`);
  }
  return q;
}

/** Keyset pagination — stable order by created_at, id (avoids offset skip/dup). */
async function fetchPaymentsAll(
  supabase: ReturnType<typeof createClient>,
  filters: Filters,
): Promise<PaymentRow[]> {
  const out: PaymentRow[] = [];
  let cursorCreated: string | null = null;
  let cursorId: string | null = null;

  while (out.length < MAX_ROWS) {
    let query = supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(PAGE_SIZE);

    query = applyFilters(query, filters);

    if (cursorCreated && cursorId) {
      // (created_at, id) > (cursorCreated, cursorId)
      query = query.or(
        `created_at.gt.${cursorCreated},and(created_at.eq.${cursorCreated},id.gt.${cursorId})`,
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as PaymentRow[];
    if (!rows.length) break;
    out.push(...rows);
    const last = rows[rows.length - 1]!;
    cursorCreated = String(last.created_at);
    cursorId = String(last.id);
    if (rows.length < PAGE_SIZE) break;
  }

  return out;
}

function setColumnWidths(ws: XLSX.WorkSheet, headers: string[], sampleRows: Record<string, unknown>[]) {
  ws['!cols'] = headers.map((h) => {
    let max = h.length;
    for (const row of sampleRows.slice(0, 50)) {
      const len = String(row[h] ?? '').length;
      if (len > max) max = len;
    }
    return { wch: Math.min(Math.max(max + 2, 12), 48) };
  });
}

function buildPaymentsSheet(payments: PaymentRow[]) {
  const rows = payments.map((p) => ({
    'Payment No.': p.payment_number ?? '',
    'Date & Time': p.created_at ? new Date(String(p.created_at)) : '',
    'Customer Name': p.customer_name ?? '',
    'Account No.': p.account_number ?? '',
    Plan: p.plan_name ?? '',
    Amount: p.amount != null ? Number(p.amount) : '',
    Tax: p.tax_amount != null ? Number(p.tax_amount) : '',
    Total: p.total_amount != null ? Number(p.total_amount) : '',
    Method: p.method ?? '',
    Channel: p.channel ?? '',
    Gateway: p.gateway_slug ?? '',
    'Gateway Payment ID': p.gateway_payment_id ?? '',
    Status: p.status ?? '',
    'Confirmed At': p.confirmed_at ? new Date(String(p.confirmed_at)) : '',
    'Next Due Date': p.next_due_date ?? '',
    'Review Notes': p.review_notes ?? '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows, { cellDates: true });
  const headers = Object.keys(rows[0] ?? { 'Payment No.': '' });
  setColumnWidths(ws, headers, rows as Record<string, unknown>[]);

  // Number / date formats (SheetJS cell.z)
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  const headerMap: Record<number, string> = {};
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    headerMap[C] = String(ws[addr]?.v ?? '');
  }
  for (let R = 1; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (!cell) continue;
      const header = headerMap[C];
      if (['Amount', 'Tax', 'Total'].includes(header) && typeof cell.v === 'number') {
        cell.t = 'n';
        cell.z = '₹#,##0.00';
      }
      if (['Date & Time', 'Confirmed At'].includes(header) && cell.v instanceof Date) {
        cell.t = 'd';
        cell.z = 'yyyy-mm-dd hh:mm';
      }
    }
  }

  return { ws, rows };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY') ?? SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: isAdmin } = await userClient.rpc('is_admin_user');
    if (!isAdmin) throw new Error('Admin access required');

    const body = await req.json();
    const filters = (body.filters ?? {}) as Filters;
    // PDF path previously uploaded fake HTML as application/pdf — keep xlsx as the real export.
    // Optional format=html returns an HTML table report with correct content-type.
    const format: 'xlsx' | 'html' | 'pdf' = body.format === 'html' || body.format === 'pdf' ? 'html' : 'xlsx';

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const payments = await fetchPaymentsAll(supabase, filters);
    const stamp = exportTimestamp();

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const { ws, rows } = buildPaymentsSheet(payments);
      XLSX.utils.book_append_sheet(wb, ws, 'All Payments');

      const confirmed = payments.filter((p) => p.status === 'confirmed');
      const summary = [
        {
          'Total Collected': confirmed.reduce((s, p) => s + Number(p.total_amount ?? 0), 0),
          'Pending Review': payments.filter((p) => p.status === 'pending_review').length,
          'Cash Pending': payments.filter((p) => p.status === 'cash_collected').length,
          Failed: payments.filter((p) => p.status === 'failed').length,
          'Row Count': payments.length,
        },
      ];
      const summaryWs = XLSX.utils.json_to_sheet(summary);
      setColumnWidths(summaryWs, Object.keys(summary[0]!), summary);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const filename = `payments_export_${stamp}.xlsx`;
      await supabase.storage.from('exports').upload(filename, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: false,
      });

      const { data: signed, error: signErr } = await supabase.storage
        .from('exports')
        .createSignedUrl(filename, 300);
      if (signErr) throw signErr;

      return new Response(JSON.stringify({ url: signed.signedUrl, filename, rowCount: rows.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Honest HTML report (was mislabeled as PDF before)
    const headers = [
      'Payment No.',
      'Date & Time',
      'Customer Name',
      'Account No.',
      'Plan',
      'Amount',
      'Total',
      'Method',
      'Status',
    ];
    const htmlRows = payments
      .map(
        (p) =>
          `<tr>${[
            p.payment_number,
            p.created_at,
            p.customer_name,
            p.account_number,
            p.plan_name,
            p.amount,
            p.total_amount,
            p.method,
            p.status,
          ]
            .map((v) => `<td>${v ?? ''}</td>`)
            .join('')}</tr>`,
      )
      .join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payments Export</title>
<style>body{font-family:system-ui,sans-serif;padding:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px 8px;font-size:12px;text-align:left}th{background:#f5f5f5}</style>
</head><body><h1>Payments Export</h1><p>${payments.length} rows · ${stamp}</p>
<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${htmlRows}</tbody></table>
</body></html>`;

    const filename = `payments_export_${stamp}.html`;
    await supabase.storage.from('exports').upload(filename, new TextEncoder().encode(html), {
      contentType: 'text/html; charset=utf-8',
      upsert: false,
    });
    const { data: signed, error: signErr } = await supabase.storage
      .from('exports')
      .createSignedUrl(filename, 300);
    if (signErr) throw signErr;

    return new Response(JSON.stringify({ url: signed.signedUrl, filename, rowCount: payments.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
