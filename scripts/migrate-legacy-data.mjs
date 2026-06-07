#!/usr/bin/env node
/**
 * Migrate data from legacy Supabase (oypkgopmneedyshuzmnh) to new project (afsaadjdhqnvsgkmmupq).
 *
 * Usage:
 *   OLD_SUPABASE_SERVICE_KEY=... NEW_SUPABASE_SERVICE_KEY=... node scripts/migrate-legacy-data.mjs
 *
 * Requires service role keys for both projects (never commit keys).
 */

const OLD_URL = process.env.OLD_SUPABASE_URL ?? 'https://oypkgopmneedyshuzmnh.supabase.co';
const NEW_URL = process.env.NEW_SUPABASE_URL ?? 'https://afsaadjdhqnvsgkmmupq.supabase.co';
const OLD_KEY = process.env.OLD_SUPABASE_SERVICE_KEY;
const NEW_KEY = process.env.NEW_SUPABASE_SERVICE_KEY;

if (!OLD_KEY || !NEW_KEY) {
  console.error('Set OLD_SUPABASE_SERVICE_KEY and NEW_SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const PAGE = 1000;

/** FK-safe migration order */
const TABLE_ORDER = [
  'company_info',
  'general_settings',
  'faqs',
  'testimonials',
  'allowed_onboarding_emails',
  'performance_rules',
  'officer_roles',
  'officer_role_permissions',
  'admin_locations',
  'shift_schedules',
  'upi_qr_codes',
  'invoice_settings',
  'plans',
  'users',
  'admins',
  'profiles',
  'officers',
  'officer_onboarding',
  'officer_contracts',
  'service_requests',
  'request_activities',
  'ticket_sla_tracking',
  'user_payments',
  'invoice_history',
  'payment_notifications',
  'subscriptions',
  'invoices',
  'inventory_categories',
  'inventory_items',
  'inventory_transactions',
  'inventory_assignments',
  'inventory_stock_update_requests',
  'officer_attendance',
  'officer_shifts',
  'officer_shift_requests',
  'attendance_approval_requests',
  'officer_leaves',
  'officer_pay_runs',
  'officer_payslips',
  'officer_payslip_line_items',
  'officer_payslip_adjustment_audit',
  'officer_pay_run_events',
  'officer_pay_period_locks',
  'officer_location_history',
  'notification_queue',
  'notification_sent_history',
  'user_notification_audit_history',
  'shift_notifications',
  'user_action_logs',
  'officer_action_logs',
  'company_knowledge',
  'knowledge_base',
  'knowledge_ingestion_logs',
  'admin_backup_files',
  'owners',
];

const counts = { ok: {}, skip: {}, fail: {} };
const emailSeen = new Map();

/** Target columns fetched from new project schema (see docs/SUPABASE_MIGRATION_INVENTORY.md) */
let TARGET_COLUMNS = null;

async function loadTargetColumns() {
  if (TARGET_COLUMNS) return TARGET_COLUMNS;
  const res = await fetch(`${NEW_URL}/rest/v1/rpc/get_migration_target_columns`, {
    method: 'POST',
    headers: headers(NEW_KEY),
    body: '{}',
  }).catch(() => null);
  if (res?.ok) {
    const rows = await res.json();
    TARGET_COLUMNS = rows.reduce((acc, r) => {
      (acc[r.table_name] ??= new Set()).add(r.column_name);
      return acc;
    }, {});
    return TARGET_COLUMNS;
  }
  // Fallback: load embedded map from migration run
  const mod = await import('./migration-target-columns.mjs');
  TARGET_COLUMNS = mod.default;
  return TARGET_COLUMNS;
}

function filterRow(table, row) {
  const cols = TARGET_COLUMNS?.[table];
  if (!cols) return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (cols.has(k)) out[k] = v;
  }
  return out;
}

function headers(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal',
  };
}

async function fetchAll(clientUrl, key, table) {
  const rows = [];
  let offset = 0;
  while (true) {
    const res = await fetch(
      `${clientUrl}/rest/v1/${table}?select=*&limit=${PAGE}&offset=${offset}`,
      { headers: headers(key) },
    );
    if (!res.ok) {
      const text = await res.text();
      if (text.includes('PGRST205') || text.includes('does not exist')) return null;
      throw new Error(`${table} fetch ${res.status}: ${text.slice(0, 200)}`);
    }
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    rows.push(...batch);
    if (batch.length < PAGE) break;
    offset += PAGE;
  }
  return rows;
}

function transformRow(table, row) {
  let r = { ...row };
  if (table === 'testimonials' && r.comment && !r.content) r.content = r.comment;
  if (table === 'notification_queue' && r.body && !r.payload) {
    r.payload = { body: r.body, title: r.title ?? null };
    delete r.body;
    delete r.title;
  }
  if (table === 'user_notification_audit_history' && r.body && !r.payload) {
    r.payload = { body: r.body, ...(typeof r.payload === 'object' ? r.payload : {}) };
    delete r.body;
  }
  if (table === 'shift_notifications' && r.message && !r.body) {
    r.body = r.message;
    delete r.message;
  }
  if (table === 'officer_onboarding') {
    const known = new Set(['id', 'officer_id', 'status', 'data', 'created_at', 'updated_at']);
    const extra = {};
    for (const [k, v] of Object.entries(r)) {
      if (!known.has(k)) extra[k] = v;
    }
    r.data = { ...(r.data ?? {}), ...extra };
    for (const k of Object.keys(extra)) delete r[k];
  }
  if (table === 'users') {
    r.role = r.role ?? 'customer';
    if (!r.name && r.first_name) r.name = r.first_name;
    if (!r.email) r.email = `legacy-${r.id}@placeholder.local`;
    if (r.email) {
      const key = r.email.toLowerCase();
      if (emailSeen.has(key) && emailSeen.get(key) !== r.id) {
        r.email = `dup+${String(r.id).slice(0, 8)}+${r.email}`;
      }
      emailSeen.set(r.email.toLowerCase(), r.id);
    }
  }
  if (table === 'plans') {
    if (r.speed && !r.speed_mbps) {
      const n = parseInt(String(r.speed).replace(/\D/g, ''), 10);
      if (!Number.isNaN(n)) r.speed_mbps = n;
    }
    if (r.features && typeof r.features === 'object' && !Array.isArray(r.features)) {
      r.features = Object.values(r.features).map(String);
    }
  }
  if (table === 'officers' && !r.user_id && r.auth_user_id) {
    r.user_id = r.auth_user_id;
  }
  if (table === 'service_requests') {
    if (r.type && !r.request_type) r.request_type = mapRequestType(r.type);
    if (r.location_lat && !r.latitude) r.latitude = r.location_lat;
    if (r.location_lng && !r.longitude) r.longitude = r.location_lng;
  }
  if (table === 'user_payments') {
    if (r.payment_status && !['success', 'failed', 'refunded'].includes(r.payment_status)) {
      r.payment_status = r.payment_status === 'completed' ? 'success' : r.payment_status;
    }
  }
  r = filterRow(table, r);
  return r;
}

function mapRequestType(type) {
  const t = String(type).toLowerCase();
  if (['installation', 'repair', 'upgrade', 'complaint'].includes(t)) return t;
  return 'repair';
}

async function upsertBatch(table, rows) {
  if (!rows.length) return 0;
  const chunk = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk).map((row) => transformRow(table, row));
    const res = await fetch(`${NEW_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...headers(NEW_KEY), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(slice),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${table} upsert ${res.status}: ${text.slice(0, 400)}`);
    }
    inserted += slice.length;
  }
  return inserted;
}

async function migrateAuthUsers() {
  let page = 1;
  let migrated = 0;
  while (true) {
    const res = await fetch(`${OLD_URL}/auth/v1/admin/users?page=${page}&per_page=1000`, {
      headers: headers(OLD_KEY),
    });
    if (!res.ok) throw new Error(`auth list ${res.status}`);
    const data = await res.json();
    const users = data.users ?? [];
    if (!users.length) break;
    for (const u of users) {
      const createRes = await fetch(`${NEW_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: headers(NEW_KEY),
        body: JSON.stringify({
          id: u.id,
          email: u.email,
          phone: u.phone,
          email_confirm: true,
          user_metadata: u.user_metadata ?? {},
          app_metadata: u.app_metadata ?? {},
        }),
      });
      if (createRes.ok) migrated++;
      else {
        const err = await createRes.text();
        if (!err.includes('already been registered') && !err.includes('duplicate') && !err.includes('already exists')) {
          console.warn('auth user skip', u.email, err.slice(0, 120));
        } else {
          migrated++;
        }
      }
    }
    if (users.length < 1000) break;
    page++;
  }
  return migrated;
}

async function bridgeAdminRoles() {
  const admins = await fetchAll(OLD_URL, OLD_KEY, 'admins');
  if (!admins?.length) return;
  for (const admin of admins) {
    const userRow = {
      id: admin.auth_user_id ?? admin.id,
      email: admin.email,
      name: admin.name,
      phone: admin.phone,
      role: 'admin',
      is_blocked: admin.is_active === false,
    };
    await fetch(`${NEW_URL}/rest/v1/users`, {
      method: 'POST',
      headers: headers(NEW_KEY),
      body: JSON.stringify([userRow]),
    });
  }
}

async function clearSeedPlans() {
  await fetch(`${NEW_URL}/rest/v1/plans?id=not.is.null`, {
    method: 'DELETE',
    headers: { ...headers(NEW_KEY), Prefer: 'return=minimal' },
  });
}

async function main() {
  console.log('Starting legacy data migration...');
  await loadTargetColumns();
  await clearSeedPlans();

  console.log('Migrating auth users first...');
  const authCount = await migrateAuthUsers();
  console.log(`auth users migrated/attempted: ${authCount}`);

  for (const table of TABLE_ORDER) {
    try {
      const rows = await fetchAll(OLD_URL, OLD_KEY, table);
      if (rows === null) {
        counts.skip[table] = 'missing';
        console.log(`skip ${table} (not on source)`);
        continue;
      }
      const n = await upsertBatch(table, rows);
      counts.ok[table] = n;
      console.log(`ok ${table}: ${n} rows`);
    } catch (e) {
      counts.fail[table] = String(e.message ?? e);
      console.error(`fail ${table}:`, e.message ?? e);
    }
  }

  console.log('Bridging admin roles...');
  await bridgeAdminRoles();

  console.log('\n=== Summary ===');
  console.log(JSON.stringify({ ok: counts.ok, skip: counts.skip, fail: counts.fail }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
