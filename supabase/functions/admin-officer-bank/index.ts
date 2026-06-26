import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';
import { corsHeaders } from '../_shared/cors.ts';
import { decryptValue, encryptValue, isEncrypted } from '../_shared/officerPii.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

type BankDetailsInput = {
  bankName?: string | null;
  accountHolderName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
};

type RequestBody = {
  action: 'save' | 'reveal' | 'backfill';
  officerId?: string;
  bankDetails?: BankDetailsInput;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization');

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: isAdmin, error: rpcError } = await userClient.rpc('is_admin_user');
    if (rpcError) throw rpcError;
    if (!isAdmin) return json({ error: 'Forbidden' }, 403);

    const { data: { user: adminUser } } = await userClient.auth.getUser();

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = (await req.json()) as RequestBody;
    const { action, officerId, bankDetails } = body;

    if (action === 'save') {
      if (!officerId) throw new Error('officerId is required');
      const b = bankDetails ?? {};

      // A masked placeholder ("••••••") means "unchanged" — never overwrite the
      // stored ciphertext with the mask. Fetch existing and only replace sensitive
      // fields when a real new value is supplied.
      const isMasked = (v?: string | null) => !!v && v.startsWith('••');
      const { data: existing } = await adminClient
        .from('officer_bank_details')
        .select('account_number, ifsc_code')
        .eq('officer_id', officerId)
        .maybeSingle();

      const acctInput = b.accountNumber?.trim() || null;
      const ifscInput = b.ifscCode?.trim() || null;
      const nextAccount = isMasked(b.accountNumber)
        ? (existing?.account_number ?? null)
        : await encryptValue(acctInput);
      const nextIfsc = isMasked(b.ifscCode)
        ? (existing?.ifsc_code ?? null)
        : await encryptValue(ifscInput);

      const { error } = await adminClient.from('officer_bank_details').upsert(
        {
          officer_id: officerId,
          bank_name: b.bankName?.trim() || null,
          account_holder_name: b.accountHolderName?.trim() || null,
          account_number: nextAccount,
          ifsc_code: nextIfsc,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'officer_id' },
      );
      if (error) throw error;

      await adminClient.from('audit_logs').insert({
        actor_id: adminUser?.id ?? null,
        action: 'officer_bank_updated',
        target_entity: officerId,
        status: 'SUCCESS',
      });
      return json({ success: true });
    }

    if (action === 'reveal') {
      if (!officerId) throw new Error('officerId is required');
      const { data: row, error } = await adminClient
        .from('officer_bank_details')
        .select('bank_name, account_holder_name, account_number, ifsc_code')
        .eq('officer_id', officerId)
        .maybeSingle();
      if (error) throw error;
      if (!row) return json({ bankDetails: null });

      const result = {
        bankName: row.bank_name as string | null,
        accountHolderName: row.account_holder_name as string | null,
        accountNumber: await decryptValue(row.account_number as string | null),
        ifscCode: await decryptValue(row.ifsc_code as string | null),
      };

      await adminClient.from('audit_logs').insert({
        actor_id: adminUser?.id ?? null,
        action: 'officer_bank_revealed',
        target_entity: officerId,
        status: 'SUCCESS',
      });
      return json({ bankDetails: result });
    }

    if (action === 'backfill') {
      const { data: rows, error } = await adminClient
        .from('officer_bank_details')
        .select('officer_id, account_number, ifsc_code');
      if (error) throw error;

      let updated = 0;
      for (const row of rows ?? []) {
        const acct = row.account_number as string | null;
        const ifsc = row.ifsc_code as string | null;
        if (isEncrypted(acct) && isEncrypted(ifsc)) continue;
        const { error: upErr } = await adminClient
          .from('officer_bank_details')
          .update({
            account_number: await encryptValue(acct),
            ifsc_code: await encryptValue(ifsc),
          })
          .eq('officer_id', row.officer_id as string);
        if (upErr) throw upErr;
        updated += 1;
      }

      await adminClient.from('audit_logs').insert({
        actor_id: adminUser?.id ?? null,
        action: 'officer_bank_backfill',
        target_entity: 'officer_bank_details',
        new_values: { updated },
        status: 'SUCCESS',
      });
      return json({ success: true, updated });
    }

    throw new Error('Unknown action');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 400);
  }
});
