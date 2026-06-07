#!/usr/bin/env node
/** Post-migration validation: compare row counts on new project vs expected legacy counts. */
const NEW_URL = process.env.NEW_SUPABASE_URL ?? 'https://afsaadjdhqnvsgkmmupq.supabase.co';
const NEW_KEY = process.env.NEW_SUPABASE_SERVICE_KEY;
if (!NEW_KEY) {
  console.error('Set NEW_SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const EXPECTED_MIN = {
  users: 3700,
  plans: 25,
  faqs: 8,
  company_info: 1,
  general_settings: 1,
  notification_queue: 4000,
};

async function count(table) {
  const res = await fetch(`${NEW_URL}/rest/v1/${table}?select=id&limit=1`, {
    headers: {
      apikey: NEW_KEY,
      Authorization: `Bearer ${NEW_KEY}`,
      Prefer: 'count=exact',
    },
  });
  if (!res.ok) return -1;
  const range = res.headers.get('content-range') ?? '';
  return range.includes('/') ? parseInt(range.split('/')[1], 10) : 0;
}

(async () => {
  let pass = true;
  for (const [table, min] of Object.entries(EXPECTED_MIN)) {
    const n = await count(table);
    const ok = n >= min;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${table}: ${n} (min ${min})`);
    if (!ok) pass = false;
  }
  process.exit(pass ? 0 : 1);
})();
