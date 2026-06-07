/**
 * Admin-only backup & export (Supabase JWT).
 *
 * Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto),
 *          DATABASE_URL — Database Settings → Connection string (URI), pooler :6543 recommended.
 *
 * POST JSON body: { action: string, backupId?: string }
 * Actions:
 *  - export_users | export_officers | export_reports | export_transactions | export_workbook → .xlsx binary
 *  - create_sql_backup → application/sql binary (+ upload + admin_backup_files row)
 *  - delete_backup → JSON { ok: true }
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import * as XLSX from 'npm:xlsx@0.18.5';
import { corsHeaders } from './cors.ts';
import {
  buildLogicalSqlDump,
  formatTimestamp,
  getDatabaseUrl,
  getPool,
  uploadSqlBackup,
} from '../_shared/admin_sql_backup.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DATABASE_URL = getDatabaseUrl();

/** PostgREST default max rows per request is often 1000 — paginate to fetch everything. */
const MAX_ROWS_PER_REQUEST = 1000;
const MAX_ROWS_EXPORT = 500_000;

/** Multi-sheet workbook: business tables (skip huge vector / system tables). */
const WORKBOOK_TABLES: { table: string; sheet: string; order: string; max: number }[] = [
  { table: 'users', sheet: 'Users', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'officers', sheet: 'Officers', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'profiles', sheet: 'Profiles', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'plans', sheet: 'Plans', order: 'created_at', max: 10_000 },
  { table: 'subscriptions', sheet: 'Subscriptions', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'service_requests', sheet: 'ServiceRequests', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'request_activities', sheet: 'RequestActivities', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'user_payments', sheet: 'UserPayments', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'payment_notifications', sheet: 'PayNotifications', order: 'created_at', max: 50_000 },
  { table: 'invoices', sheet: 'Invoices', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'invoice_history', sheet: 'InvoiceHistory', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'officer_onboarding', sheet: 'OfficerOnboarding', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'officer_contracts', sheet: 'OfficerContracts', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'officer_attendance', sheet: 'OfficerAttendance', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'officer_shifts', sheet: 'OfficerShifts', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'officer_shift_requests', sheet: 'ShiftRequests', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'officer_leaves', sheet: 'OfficerLeaves', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'officer_week_off_days', sheet: 'OfficerWeekOff', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'officer_payslips', sheet: 'OfficerPayslips', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'officer_pay_runs', sheet: 'OfficerPayRuns', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'officer_payslip_line_items', sheet: 'PayslipLineItems', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'officer_payslip_adjustment_audit', sheet: 'PayslipAdjAudit', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'officer_pay_run_events', sheet: 'PayRunEvents', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'officer_pay_period_locks', sheet: 'PayPeriodLocks', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'attendance_approval_requests', sheet: 'AttendApproval', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'officer_roles', sheet: 'OfficerRoles', order: 'created_at', max: 10_000 },
  { table: 'officer_role_permissions', sheet: 'RolePermissions', order: 'created_at', max: 10_000 },
  { table: 'inventory_items', sheet: 'InventoryItems', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'inventory_categories', sheet: 'InvCategories', order: 'created_at', max: 10_000 },
  { table: 'inventory_transactions', sheet: 'InvTransactions', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'inventory_assignments', sheet: 'InvAssignments', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'inventory_assignment_requests', sheet: 'InvAssignReq', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'inventory_stock_update_requests', sheet: 'InvStockReq', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'admin_locations', sheet: 'AdminLocations', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'shift_schedules', sheet: 'ShiftSchedules', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'shift_check_ins', sheet: 'ShiftCheckIns', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'shift_notifications', sheet: 'ShiftNotifs', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'notification_sent_history', sheet: 'NotifSentHist', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'notification_queue', sheet: 'NotifQueue', order: 'created_at', max: 100_000 },
  { table: 'user_notification_audit_history', sheet: 'UserNotifAudit', order: 'created_at', max: 100_000 },
  { table: 'notification_drafts', sheet: 'NotifDrafts', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'user_notifications', sheet: 'UserNotifs', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'user_action_logs', sheet: 'UserActionLogs', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'officer_action_logs', sheet: 'OfficerActLogs', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'officer_location_history', sheet: 'OfficerLocHist', order: 'timestamp', max: 150_000 },
  { table: 'ticket_comments', sheet: 'TicketComments', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'ticket_attachments', sheet: 'TicketAttach', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'ticket_ratings', sheet: 'TicketRatings', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'ticket_sla_tracking', sheet: 'TicketSLA', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'company_info', sheet: 'CompanyInfo', order: 'updated_at', max: 1000 },
  { table: 'faqs', sheet: 'FAQs', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'testimonials', sheet: 'Testimonials', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'invoice_settings', sheet: 'InvoiceSettings', order: 'updated_at', max: 1000 },
  { table: 'general_settings', sheet: 'GeneralSettings', order: 'updated_at', max: 100 },
  { table: 'allowed_onboarding_emails', sheet: 'AllowEmails', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'upi_qr_codes', sheet: 'UpiQrCodes', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'performance_rules', sheet: 'PerfRules', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'officer_performance_wallet', sheet: 'OfficerWallet', order: 'updated_at', max: MAX_ROWS_EXPORT },
  { table: 'officer_wallet_transactions', sheet: 'WalletTxns', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'officer_monthly_performance', sheet: 'OfficerMonthlyPerf', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'knowledge_ingestion_logs', sheet: 'KbIngestLogs', order: 'created_at', max: MAX_ROWS_EXPORT },
  { table: 'admins', sheet: 'Admins', order: 'created_at', max: 1000 },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse(401, { error: 'Missing Authorization' });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: isAdmin, error: rpcErr } = await userClient.rpc('is_admin_user');
    if (rpcErr) throw rpcErr;
    if (!isAdmin) {
      return jsonResponse(403, { error: 'Forbidden' });
    }

    const { data: userData } = await userClient.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      return jsonResponse(401, { error: 'Invalid user' });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let body: { action?: string; backupId?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON body' });
    }

    const action = body.action ?? '';
    switch (action) {
      case 'export_users':
        return await exportUsersXlsx(admin);
      case 'export_officers':
        return await exportOfficersXlsx(admin);
      case 'export_reports':
        return await exportReportsXlsx(admin);
      case 'export_transactions':
        return await exportTransactionsXlsx(admin);
      case 'export_workbook':
        return await exportFullWorkbook(admin);
      case 'create_sql_backup':
        return await createSqlBackup(admin, userId);
      case 'delete_backup':
        return await deleteBackup(admin, userId, body.backupId);
      default:
        return jsonResponse(400, { error: 'Unknown action' });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('admin-backup-export:', msg);
    return jsonResponse(500, { error: msg });
  }
});

function jsonResponse(status: number, obj: Record<string, unknown>) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Flutter `functions.invoke` only returns raw bytes when Content-Type is application/octet-stream. */
function binaryFileResponse(
  buf: Uint8Array,
  filename: string,
  extraHeaders?: Record<string, string>,
): Response {
  const headers: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${filename}"`,
    ...extraHeaders,
  };
  return new Response(buf, { status: 200, headers });
}

async function fetchTableAll(
  admin: ReturnType<typeof createClient>,
  table: string,
  orderColumn: string,
  maxRows: number,
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let offset = 0;
  while (out.length < maxRows) {
    const take = Math.min(MAX_ROWS_PER_REQUEST, maxRows - out.length);
    const { data, error } = await admin
      .from(table)
      .select('*')
      .order(orderColumn, { ascending: false })
      .range(offset, offset + take - 1);
    if (error) throw error;
    const rows = (data ?? []) as Record<string, unknown>[];
    if (rows.length === 0) break;
    out.push(...rows);
    if (rows.length < take) break;
    offset += take;
  }
  return out;
}

async function exportFullWorkbook(admin: ReturnType<typeof createClient>) {
  const wb = XLSX.utils.book_new();
  for (const def of WORKBOOK_TABLES) {
    const sheetName = def.sheet.slice(0, 31);
    try {
      const rows = await fetchTableAll(admin, def.table, def.order, def.max);
      if (rows.length === 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['No data']]), sheetName);
      } else {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sanitizeRows(rows)), sheetName);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const errSheet = (def.sheet + '_err').slice(0, 31);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Error', msg]]), errSheet);
    }
  }

  // Optional payments table (not all projects have it)
  try {
    const payRows = await fetchTableAll(admin, 'payments', 'created_at', MAX_ROWS_EXPORT);
    const sn = 'payments'.slice(0, 31);
    if (payRows.length === 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['No data']]), sn);
    } else {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sanitizeRows(payRows)), sn);
    }
  } catch {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['Note', 'payments table not available or empty']]),
      'payments_info',
    );
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Uint8Array;
  return binaryFileResponse(buf, 'prime_fibernet_full_export.xlsx');
}

async function exportUsersXlsx(admin: ReturnType<typeof createClient>) {
  const rows = await fetchTableAll(admin, 'users', 'created_at', MAX_ROWS_EXPORT);
  return xlsxResponse(rows, 'users_export.xlsx', 'Users');
}

async function exportOfficersXlsx(admin: ReturnType<typeof createClient>) {
  const rows = await fetchTableAll(admin, 'officers', 'created_at', MAX_ROWS_EXPORT);
  return xlsxResponse(sanitizeRows(rows), 'officers_export.xlsx', 'Officers');
}

async function exportReportsXlsx(admin: ReturnType<typeof createClient>) {
  const wb = XLSX.utils.book_new();
  const now = new Date();
  const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevStart = new Date(windowStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Always include client-side snapshot sheets (no DATABASE_URL required)
  const summaryCounts = await buildClientReportSheets(admin, wb, windowStart, now, prevStart);

  if (!DATABASE_URL) {
    const summaryRows = [
      ['Metric', 'Value'],
      ...Object.entries(summaryCounts).map(([k, v]) => [k, String(v)]),
      ['Note', 'Set DATABASE_URL on this Edge Function for SQL-based revenue / series sheets.'],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Uint8Array;
    return binaryFileResponse(buf, 'reports_snapshot.xlsx');
  }

  const summarySql = `
    select
      coalesce((select sum(p.price)::numeric from subscriptions s join plans p on p.id = s.plan_id where s.created_at >= $1 and s.created_at < $2), 0) as revenue_current,
      coalesce((select sum(p.price)::numeric from subscriptions s join plans p on p.id = s.plan_id where s.created_at >= $3 and s.created_at < $1), 0) as revenue_previous,
      (select count(*) from service_requests r where r.created_at >= $1 and r.created_at < $2) as requests_current,
      (select count(*) from service_requests r where r.created_at >= $3 and r.created_at < $1) as requests_previous,
      (select count(*) from users u where u.created_at >= $1 and u.created_at < $2) as new_users_current,
      (select count(*) from users u where u.created_at >= $3 and u.created_at < $1) as new_users_previous,
      (select count(*) from subscriptions s where s.status <> 'active' and s.end_at >= $1::date and s.end_at < $2::date) as churn_current,
      (select count(*) from subscriptions s where s.status <> 'active' and s.end_at >= $3::date and s.end_at < $1::date) as churn_previous,
      (select count(*) from subscriptions s where s.created_at >= $1 and s.created_at < $2) as subscriptions_current,
      (select count(*) from subscriptions s) as total_subscriptions,
      (select count(*) from users) as total_users
  `;

  const pool = await getPool();
  const client = await pool.connect();
  try {
    const { rows: sumRows } = await client.query(summarySql, [
      windowStart.toISOString(),
      now.toISOString(),
      prevStart.toISOString(),
    ]);
    const s = sumRows[0] ?? {};
    const summaryRows = [
      ['Metric', 'Value'],
      ['Revenue (current window)', String(s.revenue_current ?? '')],
      ['Revenue (previous window)', String(s.revenue_previous ?? '')],
      ['Service requests (current)', String(s.requests_current ?? '')],
      ['Service requests (previous)', String(s.requests_previous ?? '')],
      ['New users (current)', String(s.new_users_current ?? '')],
      ['New users (previous)', String(s.new_users_previous ?? '')],
      ['Churn (current window)', String(s.churn_current ?? '')],
      ['Churn (previous window)', String(s.churn_previous ?? '')],
      ['New subscriptions (current)', String(s.subscriptions_current ?? '')],
      ['Total subscriptions', String(s.total_subscriptions ?? '')],
      ['Total users', String(s.total_users ?? '')],
      ['Window start', windowStart.toISOString()],
      ['Window end', now.toISOString()],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'SummarySQL');

    const q = (sql: string) =>
      client.query(sql, [windowStart.toISOString(), now.toISOString()]).then((r) => r.rows);

    const revenueSeries = await q(`
      select date_trunc('day', s.created_at) as bucket, coalesce(sum(p.price)::numeric, 0) as value
      from subscriptions s
      join plans p on p.id = s.plan_id
      where s.created_at >= $1 and s.created_at < $2
      group by 1 order by 1
    `);
    const reqSeries = await q(`
      select date_trunc('day', r.created_at) as bucket, count(*)::numeric as value
      from service_requests r
      where r.created_at >= $1 and r.created_at < $2
      group by 1 order by 1
    `);
    const userSeries = await q(`
      select date_trunc('day', u.created_at) as bucket, count(*)::numeric as value
      from users u
      where u.created_at >= $1 and u.created_at < $2
      group by 1 order by 1
    `);

    const appendSheet = (name: string, data: Record<string, unknown>[]) => {
      if (data.length === 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['No data']]), name.slice(0, 31));
        return;
      }
      const normalized = data.map((r) => ({
        bucket: r.bucket instanceof Date ? (r.bucket as Date).toISOString() : r.bucket,
        value: r.value,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(normalized), name.slice(0, 31));
    };

    appendSheet('RevenueSeries', revenueSeries);
    appendSheet('RequestSeries', reqSeries);
    appendSheet('UserSeries', userSeries);

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Uint8Array;
    return binaryFileResponse(buf, 'reports_snapshot.xlsx');
  } finally {
    client.release();
    await pool.end();
  }
}

/** Snapshot tables for reporting without direct SQL (Supabase client only). */
async function buildClientReportSheets(
  admin: ReturnType<typeof createClient>,
  wb: ReturnType<typeof XLSX.utils.book_new>,
  windowStart: Date,
  now: Date,
  prevStart: Date,
): Promise<Record<string, number>> {
  const { count: totalUsers } = await admin.from('users').select('*', { count: 'exact', head: true });
  const { count: totalReq } = await admin.from('service_requests').select('*', { count: 'exact', head: true });
  const { count: subs } = await admin.from('subscriptions').select('*', { count: 'exact', head: true });
  const { count: officers } = await admin.from('officers').select('*', { count: 'exact', head: true });

  const winReq = await fetchTableAll(admin, 'service_requests', 'created_at', 50_000);
  const inCurrent = (r: Record<string, unknown>) => {
    const c = r['created_at'];
    if (!c) return false;
    const t = new Date(String(c)).getTime();
    return t >= windowStart.getTime() && t < now.getTime();
  };
  const inPrev = (r: Record<string, unknown>) => {
    const c = r['created_at'];
    if (!c) return false;
    const t = new Date(String(c)).getTime();
    return t >= prevStart.getTime() && t < windowStart.getTime();
  };
  const reqCurrent = winReq.filter(inCurrent);
  const reqPrev = winReq.filter(inPrev);

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(sanitizeRows(reqCurrent.length ? reqCurrent : [{ note: 'No rows in window' }])),
    'SvcReqCurrent',
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(sanitizeRows(reqPrev.length ? reqPrev : [{ note: 'No rows in window' }])),
    'SvcReqPrevious',
  );

  const subsRows = await fetchTableAll(admin, 'subscriptions', 'created_at', 50_000);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(sanitizeRows(subsRows)),
    'Subscriptions',
  );

  const plansRows = await fetchTableAll(admin, 'plans', 'created_at', 10_000);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sanitizeRows(plansRows)), 'Plans');

  return {
    total_users: totalUsers ?? 0,
    total_service_requests: totalReq ?? 0,
    total_subscriptions: subs ?? 0,
    total_officers: officers ?? 0,
    requests_in_current_window: reqCurrent.length,
    requests_in_previous_window: reqPrev.length,
  };
}

async function exportTransactionsXlsx(admin: ReturnType<typeof createClient>) {
  const wb = XLSX.utils.book_new();
  const pay = await fetchTableAll(admin, 'payments', 'created_at', MAX_ROWS_EXPORT).catch(() => [] as Record<string, unknown>[]);
  const up = await fetchTableAll(admin, 'user_payments', 'created_at', MAX_ROWS_EXPORT);

  const rowsP = sanitizeRows(pay);
  const rowsU = sanitizeRows(up);

  if (rowsP.length === 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['No data']]), 'payments');
  } else {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsP), 'payments');
  }
  if (rowsU.length === 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['No data']]), 'user_payments');
  } else {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsU), 'user_payments');
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Uint8Array;
  return binaryFileResponse(buf, 'transactions_export.xlsx');
}

function xlsxResponse(rows: Record<string, unknown>[], filename: string, sheetName: string) {
  const wb = XLSX.utils.book_new();
  if (rows.length === 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['No data']]), sheetName.slice(0, 31));
  } else {
    const sanitized = sanitizeRows(rows);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sanitized), sheetName.slice(0, 31));
  }
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Uint8Array;
  return binaryFileResponse(buf, filename);
}

function sanitizeRows(rows: Record<string, unknown>[]) {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
        try {
          out[k] = JSON.stringify(v);
        } catch {
          out[k] = String(v);
        }
      } else if (v instanceof Date) {
        out[k] = v.toISOString();
      } else {
        out[k] = v;
      }
    }
    return out;
  });
}

async function createSqlBackup(admin: ReturnType<typeof createClient>, userId: string) {
  const sqlText = await buildLogicalSqlDump();
  const bytes = new TextEncoder().encode(sqlText);
  const filename = `Backup_${formatTimestamp()}.sql`;
  const storagePath = `${userId}/${filename}`;

  const { id } = await uploadSqlBackup(admin, {
    storagePath,
    filename,
    bytes,
    createdBy: userId,
  });

  return binaryFileResponse(bytes, filename, {
    'X-Backup-Id': id,
    'Access-Control-Expose-Headers': 'X-Backup-Id',
  });
}

async function deleteBackup(admin: ReturnType<typeof createClient>, userId: string, backupId?: string) {
  if (!backupId || typeof backupId !== 'string') {
    return jsonResponse(400, { error: 'backupId required' });
  }
  const { data: row, error } = await admin
    .from('admin_backup_files')
    .select('id, storage_path, created_by')
    .eq('id', backupId)
    .single();
  if (error) throw error;
  if (!row) {
    return jsonResponse(403, { error: 'Not found' });
  }
  const isOwner = row.created_by === userId;
  const isSystem = row.created_by === null && row.storage_path.startsWith('system/');
  if (!isOwner && !isSystem) {
    return jsonResponse(403, { error: 'Not found' });
  }
  const { error: rmErr } = await admin.storage.from('admin-backups').remove([row.storage_path]);
  if (rmErr) console.warn('storage remove:', rmErr);
  const { error: delErr } = await admin.from('admin_backup_files').delete().eq('id', backupId);
  if (delErr) throw delErr;
  return jsonResponse(200, { ok: true });
}
