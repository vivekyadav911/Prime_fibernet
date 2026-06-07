#!/usr/bin/env node
/**
 * Creates dev auth users for one-tap sign-in (Phase 2).
 * Run: node scripts/seed-dev-users.mjs
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env or apps/unified-app/.env
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEV_PASSWORD = 'DevPassword123!';

const DEV_USERS = [
  {
    id: '11111111-1111-1111-1111-111111111101',
    email: 'dev-customer@prime.local',
    name: 'Dev Customer',
    phone: '9876543210',
    role: 'customer',
  },
  {
    id: '11111111-1111-1111-1111-111111111102',
    email: 'dev-officer@prime.local',
    name: 'Dev Officer',
    phone: '9876543211',
    role: 'officer',
  },
  {
    id: '11111111-1111-1111-1111-111111111103',
    email: 'dev-admin@prime.local',
    name: 'Dev Admin',
    phone: '9876543212',
    role: 'admin',
  },
];

function loadEnv() {
  const paths = [
    resolve(__dirname, '../apps/unified-app/.env'),
    resolve(__dirname, '../.env'),
  ];
  for (const p of paths) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
    }
  }
}

loadEnv();

const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function upsertAuthUser(user) {
  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === user.email || u.id === user.id);

  if (found) {
    const { error } = await supabase.auth.admin.updateUserById(found.id, {
      password: DEV_PASSWORD,
      email_confirm: true,
      user_metadata: { name: user.name, phone: user.phone, role: user.role },
      app_metadata: { role: user.role, totp_verified: user.role === 'admin' },
    });
    if (error) throw error;
    return found.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    id: user.id,
    email: user.email,
    password: DEV_PASSWORD,
    email_confirm: true,
    user_metadata: { name: user.name, phone: user.phone, role: user.role },
    app_metadata: { role: user.role, totp_verified: user.role === 'admin' },
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  console.log('Seeding dev users...');
  const ids = {};
  for (const user of DEV_USERS) {
    ids[user.role] = await upsertAuthUser(user);
    console.log(`  ✓ ${user.role}: ${user.email}`);
  }

  const customerId = ids.customer;
  const officerUserId = ids.officer;
  const adminId = ids.admin;

  await supabase.from('users').upsert([
    { id: customerId, email: 'dev-customer@prime.local', name: 'Dev Customer', phone: '9876543210', role: 'customer' },
    { id: officerUserId, email: 'dev-officer@prime.local', name: 'Dev Officer', phone: '9876543211', role: 'officer' },
    { id: adminId, email: 'dev-admin@prime.local', name: 'Dev Admin', phone: '9876543212', role: 'admin' },
  ]);

  const officerId = '22222222-2222-2222-2222-222222222201';
  await supabase.from('officers').upsert({
    id: officerId,
    user_id: officerUserId,
    auth_user_id: officerUserId,
    region: 'North Delhi',
    availability_status: 'available',
  });

  const { data: plans } = await supabase.from('plans').select('id').eq('is_active', true).limit(1);
  const planId = plans?.[0]?.id;

  if (planId) {
    await supabase.from('subscriptions').upsert({
      id: '33333333-3333-3333-3333-333333333301',
      user_id: customerId,
      plan_id: planId,
      start_at: new Date().toISOString().slice(0, 10),
      end_at: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      status: 'active',
    });
  }

  await supabase.from('service_requests').upsert([
    {
      id: '44444444-4444-4444-4444-444444444401',
      user_id: customerId,
      officer_id: officerId,
      request_type: 'repair',
      status: 'pending',
      priority: 'P1',
      address: '123 MG Road, Delhi',
      description: 'Internet connectivity issue',
      latitude: 28.6139,
      longitude: 77.209,
    },
    {
      id: '44444444-4444-4444-4444-444444444402',
      user_id: customerId,
      officer_id: officerId,
      request_type: 'installation',
      status: 'working',
      priority: 'P2',
      address: '456 CP, Delhi',
      description: 'New fiber installation',
      latitude: 28.6315,
      longitude: 77.2167,
    },
  ]);

  await supabase.from('inventory_items').upsert([
    { id: '55555555-5555-5555-5555-555555555501', name: 'Fiber Splicer', sku: 'FS-001', category: 'Tools', quantity: 1 },
    { id: '55555555-5555-5555-5555-555555555502', name: 'OTDR Tester', sku: 'OT-002', category: 'Tools', quantity: 1 },
  ]);

  await supabase.from('inventory_assignments').upsert([
    { id: '66666666-6666-6666-6666-666666666601', item_id: '55555555-5555-5555-5555-555555555501', assigned_to_id: officerId, assigned_to_type: 'officer', status: 'assigned' },
  ]);

  await supabase.from('payslips').upsert({
    id: '77777777-7777-7777-7777-777777777701',
    officer_id: officerId,
    month: new Date().toISOString().slice(0, 7) + '-01',
    base: 25000,
    bonuses: 2000,
    deductions: 1500,
    net_pay: 25500,
  });

  await supabase.from('faqs').upsert([
    { id: '88888888-8888-8888-8888-888888888801', question: 'How do I pay my bill?', answer: 'Go to Plans tab and subscribe, or use Pay Now on Payments.', is_published: true, order_index: 1 },
    { id: '88888888-8888-8888-8888-888888888802', question: 'How to raise a service request?', answer: 'Open Requests tab, fill the form and submit.', is_published: true, order_index: 2 },
  ], { onConflict: 'id' });

  console.log('\nDev password for all accounts:', DEV_PASSWORD);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
