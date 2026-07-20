/**
 * Diff-based Excel bulk import (admin JWT).
 *
 * POST JSON:
 *  { action: 'stage', entity_type, file_base64, file_name? }
 *  { action: 'commit', batch_id }
 *
 * Stage parses + validates + writes import_staging, returns preview.
 * Commit calls commit_import_batch RPC (transactional apply).
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import * as XLSX from 'npm:xlsx@0.18.5';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type EntityType = 'users' | 'plans' | 'officers' | 'transactions';
type RowAction = 'insert' | 'update' | 'unchanged' | 'error';

type FieldDiff = Record<string, { old: unknown; new: unknown }>;

type StagedRow = {
  row_number: number;
  raw_row: Record<string, unknown>;
  match_key: string | null;
  action: RowAction;
  diff: FieldDiff | null;
  error_message: string | null;
};

const ENTITY_CONFIG: Record<
  EntityType,
  {
    matchKey: string;
    allowInsert: boolean;
    table: string;
    matchColumn: string;
    editableFields: string[];
    requiredOnInsert: string[];
    normalizeMatch?: (v: string) => string;
  }
> = {
  users: {
    matchKey: 'email',
    allowInsert: true,
    table: 'users',
    matchColumn: 'email',
    editableFields: [
      'name',
      'phone',
      'first_name',
      'middle_name',
      'last_name',
      'city',
      'address',
      'district',
      'pincode',
      'state',
      'customer_id',
      'username',
    ],
    requiredOnInsert: ['email', 'name'],
    normalizeMatch: (v) => v.trim().toLowerCase(),
  },
  plans: {
    matchKey: 'name',
    allowInsert: true,
    table: 'plans',
    matchColumn: 'name',
    editableFields: [
      'display_name',
      'speed',
      'speed_mbps',
      'price',
      'validity_days',
      'description',
      'is_active',
      'plan_tag',
      'category',
      'data_limit',
    ],
    requiredOnInsert: ['name', 'price'],
  },
  officers: {
    matchKey: 'employee_id',
    allowInsert: false,
    table: 'officers',
    matchColumn: 'employee_id',
    editableFields: [
      'full_name',
      'email',
      'phone',
      'alternate_phone',
      'status',
      'city',
      'state',
      'pincode',
      'current_address',
    ],
    requiredOnInsert: ['employee_id'],
  },
  transactions: {
    matchKey: 'payment_number',
    allowInsert: false,
    table: 'payments',
    matchColumn: 'payment_number',
    editableFields: [
      'notes',
      'review_notes',
      'cash_collection_notes',
      'amount',
      'total_amount',
      'status',
    ],
    requiredOnInsert: ['payment_number'],
  },
};

const CONFIRMED_STATUSES = new Set(['confirmed', 'refunded']);
const FINANCIAL_FIELDS = new Set(['amount', 'total_amount', 'status']);

const PAYMENT_STATUSES = new Set([
  'initiated',
  'pending_review',
  'cash_collected',
  'confirmed',
  'failed',
  'refunded',
  'cancelled',
]);

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function stripHeaderSuffix(h: string): string {
  return h
    .replace(/\s*\(required\)\s*$/i, '')
    .replace(/^EXAMPLE\s*[—-]\s*/i, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function normalizeHeaderMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of headers) {
    const key = stripHeaderSuffix(String(h ?? ''));
    if (key) map[key] = h;
  }
  return map;
}

function cellToString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function normalizeValue(field: string, raw: unknown): unknown {
  if (raw == null || raw === '') return null;
  const s = cellToString(raw);
  if (s === '') return null;

  if (field === 'email') return s.toLowerCase();
  if (field === 'is_active') {
    const lower = s.toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(lower)) return true;
    if (['false', '0', 'no', 'n'].includes(lower)) return false;
    return null;
  }
  if (['speed_mbps', 'validity_days'].includes(field)) {
    const n = Number(s);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
  if (['price', 'amount', 'total_amount'].includes(field)) {
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return s;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a === 'number' || typeof b === 'number') {
    return Number(a) === Number(b);
  }
  if (typeof a === 'boolean' || typeof b === 'boolean') {
    return Boolean(a) === Boolean(b);
  }
  return String(a).trim() === String(b).trim();
}

async function parseWorkbook(
  fileBase64: string,
  entity: EntityType,
  cp?: (stage: string, extra?: Record<string, unknown>) => Promise<void>,
): Promise<{ rows: Record<string, unknown>[]; error?: string }> {
  let binary: Uint8Array;
  try {
    const raw = atob(fileBase64.includes(',') ? fileBase64.split(',').pop()! : fileBase64);
    binary = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  } catch {
    return { rows: [], error: 'Invalid base64 file payload' };
  }
  // #region agent log
  await cp?.('after-atob', { bytes: binary.length });
  // #endregion

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(binary, { type: 'array', cellDates: true });
  } catch (e) {
    return { rows: [], error: `Failed to parse Excel: ${(e as Error).message}` };
  }

  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { rows: [], error: 'Workbook has no sheets' };
  const sheet = wb.Sheets[sheetName];
  // #region agent log
  {
    const ref = (sheet['!ref'] as string) ?? null;
    let cells = -1;
    let nRows = -1;
    let nCols = -1;
    try {
      const r = XLSX.utils.decode_range(ref!);
      nRows = r.e.r - r.s.r + 1;
      nCols = r.e.c - r.s.c + 1;
      cells = nRows * nCols;
    } catch { /* noop */ }
    await cp?.('after-read', { sheetName, ref, nRows, nCols, cells });
  }
  // #endregion
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as unknown[][];
  // #region agent log
  await cp?.('after-sheet_to_json', { aoaLen: aoa.length });
  // #endregion
  if (!aoa.length) return { rows: [], error: 'Sheet is empty' };

  const headerRow = (aoa[0] ?? []).map((h) => String(h ?? ''));
  const headerMap = normalizeHeaderMap(headerRow);
  const cfg = ENTITY_CONFIG[entity];
  if (!headerMap[cfg.matchKey]) {
    return {
      rows: [],
      error: `Missing required match-key column "${cfg.matchKey}". Download the template for the correct headers.`,
    };
  }

  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const line = aoa[i] ?? [];
    const allEmpty = line.every((c) => cellToString(c) === '');
    if (allEmpty) continue;

    // Skip example rows
    const firstCell = cellToString(line[0]);
    if (/^EXAMPLE/i.test(firstCell)) continue;

    const obj: Record<string, unknown> = {};
    for (const [norm, original] of Object.entries(headerMap)) {
      const colIdx = headerRow.indexOf(original);
      obj[norm] = normalizeValue(norm, line[colIdx]);
    }
    rows.push(obj);
  }

  return { rows };
}

function computeDiff(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  fields: string[],
): FieldDiff {
  const diff: FieldDiff = {};
  for (const field of fields) {
    if (!(field in incoming) || incoming[field] === undefined) continue;
    const next = incoming[field];
    // Skip blank incoming — treat as "leave unchanged" unless explicitly clearing isn't supported
    if (next === null || next === '') continue;
    const prev = existing[field] ?? null;
    if (!valuesEqual(prev, next)) {
      diff[field] = { old: prev, new: next };
    }
  }
  return diff;
}

async function fetchExistingMap(
  admin: SupabaseClient,
  entity: EntityType,
  keys: string[],
): Promise<Map<string, Record<string, unknown>>> {
  const cfg = ENTITY_CONFIG[entity];
  const map = new Map<string, Record<string, unknown>>();
  if (!keys.length) return map;

  const chunkSize = 200;
  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    let q = admin.from(cfg.table).select('*').in(cfg.matchColumn, chunk);
    if (entity === 'plans') {
      q = q.eq('is_deleted', false);
    }
    const { data, error } = await q;
    if (error) throw error;
    for (const row of data ?? []) {
      const raw = String((row as Record<string, unknown>)[cfg.matchColumn] ?? '');
      const key = cfg.normalizeMatch ? cfg.normalizeMatch(raw) : raw.trim();
      if (key) map.set(key, row as Record<string, unknown>);
    }
  }
  return map;
}

function stageRows(
  entity: EntityType,
  parsed: Record<string, unknown>[],
  existing: Map<string, Record<string, unknown>>,
): StagedRow[] {
  const cfg = ENTITY_CONFIG[entity];
  const out: StagedRow[] = [];
  const seenKeys = new Set<string>();

  for (let i = 0; i < parsed.length; i++) {
    const rowNumber = i + 2; // 1-indexed Excel row (header = 1)
    const raw = parsed[i];
    const matchRaw = cellToString(raw[cfg.matchKey]);
    if (!matchRaw) {
      out.push({
        row_number: rowNumber,
        raw_row: raw,
        match_key: null,
        action: 'error',
        diff: null,
        error_message: `Missing required match key "${cfg.matchKey}"`,
      });
      continue;
    }

    const matchKey = cfg.normalizeMatch ? cfg.normalizeMatch(matchRaw) : matchRaw.trim();
    if (seenKeys.has(matchKey)) {
      out.push({
        row_number: rowNumber,
        raw_row: raw,
        match_key: matchKey,
        action: 'error',
        diff: null,
        error_message: `Duplicate match key "${matchKey}" in this file`,
      });
      continue;
    }
    seenKeys.add(matchKey);

    // Type checks for known numeric/boolean fields present in row
    for (const field of cfg.editableFields) {
      if (!(field in raw) || raw[field] === null || raw[field] === undefined) continue;
      if (['speed_mbps', 'validity_days', 'price', 'amount', 'total_amount'].includes(field)) {
        if (typeof raw[field] !== 'number') {
          out.push({
            row_number: rowNumber,
            raw_row: raw,
            match_key: matchKey,
            action: 'error',
            diff: null,
            error_message: `Invalid number for "${field}"`,
          });
          continue;
        }
      }
      if (field === 'is_active' && typeof raw[field] !== 'boolean') {
        out.push({
          row_number: rowNumber,
          raw_row: raw,
          match_key: matchKey,
          action: 'error',
          diff: null,
          error_message: `Invalid boolean for "is_active"`,
        });
        continue;
      }
      if (field === 'status' && entity === 'transactions') {
        if (!PAYMENT_STATUSES.has(String(raw[field]))) {
          out.push({
            row_number: rowNumber,
            raw_row: raw,
            match_key: matchKey,
            action: 'error',
            diff: null,
            error_message: `Invalid payment status "${raw[field]}"`,
          });
          continue;
        }
      }
    }
    // If we already pushed an error for this row above, skip further processing
    if (out.length && out[out.length - 1].row_number === rowNumber && out[out.length - 1].action === 'error') {
      continue;
    }

    const existingRow = existing.get(matchKey);
    if (!existingRow) {
      if (!cfg.allowInsert) {
        out.push({
          row_number: rowNumber,
          raw_row: raw,
          match_key: matchKey,
          action: 'error',
          diff: null,
          error_message: `No existing ${entity} with ${cfg.matchKey}="${matchKey}" — inserts are not allowed for this entity`,
        });
        continue;
      }
      for (const req of cfg.requiredOnInsert) {
        if (!cellToString(raw[req])) {
          out.push({
            row_number: rowNumber,
            raw_row: raw,
            match_key: matchKey,
            action: 'error',
            diff: null,
            error_message: `Missing required field "${req}" for insert`,
          });
          continue;
        }
      }
      if (out.length && out[out.length - 1].row_number === rowNumber && out[out.length - 1].action === 'error') {
        continue;
      }
      out.push({
        row_number: rowNumber,
        raw_row: raw,
        match_key: matchKey,
        action: 'insert',
        diff: null,
        error_message: null,
      });
      continue;
    }

    // Transaction safety: block financial edits on confirmed/refunded
    if (entity === 'transactions') {
      const status = String(existingRow.status ?? '');
      if (CONFIRMED_STATUSES.has(status)) {
        const attempted = cfg.editableFields.filter((f) => {
          if (!FINANCIAL_FIELDS.has(f)) return false;
          if (!(f in raw) || raw[f] == null || raw[f] === '') return false;
          return !valuesEqual(existingRow[f], raw[f]);
        });
        if (attempted.length) {
          out.push({
            row_number: rowNumber,
            raw_row: raw,
            match_key: matchKey,
            action: 'error',
            diff: null,
            error_message: `Cannot change ${attempted.join(', ')} on ${status} payment — only notes/metadata allowed`,
          });
          continue;
        }
      }
    }

    const diff = computeDiff(existingRow, raw, cfg.editableFields);
    // For confirmed payments, strip any financial keys that somehow matched (defense in depth)
    if (entity === 'transactions' && CONFIRMED_STATUSES.has(String(existingRow.status ?? ''))) {
      for (const f of FINANCIAL_FIELDS) delete diff[f];
    }

    if (Object.keys(diff).length === 0) {
      out.push({
        row_number: rowNumber,
        raw_row: raw,
        match_key: matchKey,
        action: 'unchanged',
        diff: null,
        error_message: null,
      });
    } else {
      out.push({
        row_number: rowNumber,
        raw_row: raw,
        match_key: matchKey,
        action: 'update',
        diff,
        error_message: null,
      });
    }
  }

  return out;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  // Drain the request body BEFORE any outbound I/O. In the edge runtime a large
  // unconsumed request body deadlocks the next outbound fetch (e.g. a DB query).
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return jsonResponse(400, { error: 'Could not read request body' });
  }

  // #region agent log
  const tStart = Date.now();
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let dcpRow = -100;
  let dcpPerformedBy: string | null = null;
  const dcpBatch = crypto.randomUUID();
  const dcp = async (stage: string, extra: Record<string, unknown> = {}) => {
    try {
      await admin.from('import_staging').insert({
        import_batch_id: dcpBatch,
        entity_type: 'users',
        row_number: dcpRow--,
        raw_row: { ...extra, ms: Date.now() - tStart },
        match_key: stage,
        action: 'error',
        error_message: `DCHKPT ${stage}`,
        performed_by: dcpPerformedBy,
        file_name: 'CHKPT-f10b49',
      });
    } catch { /* noop */ }
  };
  await dcp('entry', { contentLength: req.headers.get('content-length'), rawBodyLen: rawBody.length });
  // #endregion

  try {
    let body: {
      action?: string;
      entity_type?: string;
      file_base64?: string;
      file_name?: string;
      batch_id?: string;
    };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON body' });
    }
    // #region agent log
    await dcp('after-reqjson', { action: body.action ?? null, base64Len: body.file_base64?.length ?? null });
    // #endregion

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse(401, { error: 'Missing Authorization' });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: isAdmin, error: rpcErr } = await userClient.rpc('is_admin_user');
    // #region agent log
    await dcp('after-isadmin', { isAdmin, rpcErr: rpcErr?.message ?? null });
    // #endregion
    if (rpcErr) throw rpcErr;
    if (!isAdmin) return jsonResponse(403, { error: 'Forbidden' });

    const { data: userData } = await userClient.auth.getUser();
    const authUserId = userData.user?.id;
    const authEmail = (userData.user?.email ?? '').trim().toLowerCase();
    // #region agent log
    await dcp('after-getuser', { hasUser: !!authUserId, hasEmail: !!authEmail });
    // #endregion
    if (!authUserId) return jsonResponse(401, { error: 'Invalid user' });

    // Match is_admin_user(): active OR null is_active. Also fall back to email —
    // some admin JWT users are not linked via auth_user_id yet.
    let adminRow: { id: string } | null = null;
    {
      const byAuth = await admin
        .from('admins')
        .select('id')
        .eq('auth_user_id', authUserId)
        .or('is_active.eq.true,is_active.is.null')
        .maybeSingle();
      if (byAuth.error) throw byAuth.error;
      adminRow = byAuth.data;
    }
    if (!adminRow?.id && authEmail) {
      const byEmail = await admin
        .from('admins')
        .select('id')
        .ilike('email', authEmail)
        .or('is_active.eq.true,is_active.is.null')
        .maybeSingle();
      if (byEmail.error) throw byEmail.error;
      adminRow = byEmail.data;
      // Best-effort link for next time
      if (adminRow?.id) {
        await admin.from('admins').update({ auth_user_id: authUserId }).eq('id', adminRow.id);
      }
    }
    // is_admin_user() can pass via JWT/users.role without an admins row.
    // Import still proceeds; performed_by stays null for audit when unlinked.
    // #region agent log
    dcpPerformedBy = adminRow?.id ?? null;
    await dcp('after-adminrow', {
      adminId: adminRow?.id ?? null,
      linked: !!adminRow?.id,
      authEmailLen: authEmail.length,
    });
    // #endregion
    const performedBy = adminRow?.id ?? null;

    const action = body.action ?? '';

    if (action === 'stage') {
      const entity = body.entity_type as EntityType;
      if (!entity || !(entity in ENTITY_CONFIG)) {
        return jsonResponse(400, {
          error: 'entity_type must be one of: users, plans, officers, transactions',
        });
      }
      if (!body.file_base64) {
        return jsonResponse(400, { error: 'file_base64 required' });
      }

      // #region agent log
      let cpRow = -1;
      const debugBatch = crypto.randomUUID();
      const cp = async (stage: string, extra: Record<string, unknown> = {}) => {
        try {
          await admin.from('import_staging').insert({
            import_batch_id: debugBatch,
            entity_type: entity,
            row_number: cpRow--,
            raw_row: { ...extra, ms: Date.now() - tStart },
            match_key: stage,
            action: 'error',
            error_message: `CHKPT ${stage}`,
            performed_by: performedBy,
            file_name: 'CHKPT-f10b49',
          });
        } catch { /* noop */ }
      };
      await cp('before-parse', { base64Len: body.file_base64.length });
      // #endregion
      const { rows: parsed, error: parseErr } = await parseWorkbook(body.file_base64, entity, cp);
      // #region agent log
      await cp('after-parse', { parsedRows: parsed.length, parseErr: parseErr ?? null });
      // #endregion
      if (parseErr) return jsonResponse(400, { error: parseErr });
      if (!parsed.length) {
        return jsonResponse(400, { error: 'No data rows found (example rows are skipped)' });
      }

      const cfg = ENTITY_CONFIG[entity];
      const keys = parsed
        .map((r) => {
          const raw = cellToString(r[cfg.matchKey]);
          if (!raw) return '';
          return cfg.normalizeMatch ? cfg.normalizeMatch(raw) : raw.trim();
        })
        .filter(Boolean);

      const existing = await fetchExistingMap(admin, entity, keys);
      // #region agent log
      await cp('after-fetch', { keys: keys.length, existing: existing.size });
      // #endregion
      const staged = stageRows(entity, parsed, existing);
      const batchId = crypto.randomUUID();
      const fileName = body.file_name ?? `${entity}_import.xlsx`;

      const insertRows = staged.map((s) => ({
        import_batch_id: batchId,
        entity_type: entity,
        row_number: s.row_number,
        raw_row: s.raw_row,
        match_key: s.match_key,
        action: s.action,
        diff: s.diff,
        error_message: s.error_message,
        performed_by: performedBy,
        file_name: fileName,
      }));

      // Insert in chunks
      for (let i = 0; i < insertRows.length; i += 500) {
        const chunk = insertRows.slice(i, i + 500);
        const { error } = await admin.from('import_staging').insert(chunk);
        if (error) throw error;
      }
      // #region agent log
      await cp('after-insert', { inserted: insertRows.length });
      // #endregion

      const counts = {
        insert: staged.filter((s) => s.action === 'insert').length,
        update: staged.filter((s) => s.action === 'update').length,
        unchanged: staged.filter((s) => s.action === 'unchanged').length,
        error: staged.filter((s) => s.action === 'error').length,
      };

      // #region agent log
      await cp('stage-done', { counts });
      // #endregion
      return jsonResponse(200, {
        batch_id: batchId,
        entity_type: entity,
        file_name: fileName,
        counts,
        rows: staged.map((s) => ({
          row_number: s.row_number,
          match_key: s.match_key,
          action: s.action,
          diff: s.diff,
          error_message: s.error_message,
        })),
      });
    }

    if (action === 'commit') {
      const batchId = body.batch_id;
      if (!batchId) return jsonResponse(400, { error: 'batch_id required' });

      const { data: sample, error: sampleErr } = await admin
        .from('import_staging')
        .select('id, performed_by')
        .eq('import_batch_id', batchId)
        .limit(1)
        .maybeSingle();
      if (sampleErr) throw sampleErr;
      if (!sample) return jsonResponse(404, { error: 'Batch not found or already committed' });
      // Only enforce ownership when both sides have an admins.id link.
      if (
        sample.performed_by &&
        performedBy &&
        sample.performed_by !== performedBy
      ) {
        return jsonResponse(403, { error: 'Batch belongs to another admin' });
      }

      const { data: result, error: commitErr } = await admin.rpc('commit_import_batch', {
        p_batch_id: batchId,
      });
      if (commitErr) throw commitErr;

      return jsonResponse(200, result);
    }

    return jsonResponse(400, { error: 'action must be stage or commit' });
  } catch (e) {
    console.error('import-excel error', e);
    return jsonResponse(500, { error: (e as Error).message ?? 'Internal error' });
  }
});
