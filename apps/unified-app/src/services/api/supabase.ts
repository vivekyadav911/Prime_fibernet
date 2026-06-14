import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import { Mutex } from 'async-mutex';

import type { Database } from '@/types/database';
import { getEnvConfig } from '@/services/env';
import { secureStorageAdapter } from '@/services/secureStorage';

/** Runtime client; `Database` documents expected schema for future codegen alignment. */
export type TypedSupabaseClient = SupabaseClient;

export type { Database };

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 400;

const refreshMutex = new Mutex();

let client: TypedSupabaseClient | null = null;

export function getSupabase(): TypedSupabaseClient {
  if (!client) {
    const config = getEnvConfig();
    client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        storage: secureStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

function getSessionStorageKey(supabaseUrl: string): string {
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0] ?? 'local';
  return `sb-${projectRef}-auth-token`;
}

/** Read persisted JWT access token from hybrid session storage (Supabase auth). */
export async function getStoredAccessToken(): Promise<string | null> {
  const config = getEnvConfig();
  const raw = await secureStorageAdapter.getItem(getSessionStorageKey(config.supabaseUrl));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { access_token?: string };
    return parsed.access_token ?? null;
  } catch {
    return null;
  }
}

async function ensureValidSession(supabase: TypedSupabaseClient): Promise<void> {
  await refreshMutex.runExclusive(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const session = data.session;
    if (!session) return;

    const expiresAt = session.expires_at ?? 0;
    const expiresInSec = expiresAt - Math.floor(Date.now() / 1000);
    if (expiresInSec > 60) return;

    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) throw refreshError;
  });
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error && typeof error === 'object') {
    const message = String((error as { message?: string }).message ?? '');
    return /network|fetch|timeout|ECONNRESET|ENOTFOUND/i.test(message);
  }
  return false;
}

function toQueryError(error: unknown): { status: string | number; error: string } {
  if (error && typeof error === 'object' && 'message' in error) {
    return { status: 'CUSTOM_ERROR', error: String((error as { message: string }).message) };
  }
  return { status: 'CUSTOM_ERROR', error: String(error) };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type SupabaseBaseQueryArg = {
  handler: (client: TypedSupabaseClient) => Promise<unknown>;
};

export type SupabaseBaseQueryError = { status: string | number; error: string };

export const supabaseBaseQuery: BaseQueryFn<
  SupabaseBaseQueryArg,
  unknown,
  SupabaseBaseQueryError
> = async ({ handler }) => {
  const supabase = getSupabase();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      await ensureValidSession(supabase);
      const result = await handler(supabase);
      // RTK Query rejects `{ data: undefined }`; normalize void handlers to null.
      return { data: result === undefined ? null : result };
    } catch (error) {
      const shouldRetry = isNetworkError(error) && attempt < MAX_RETRIES;
      if (shouldRetry) {
        await delay(RETRY_BASE_MS * (attempt + 1));
        continue;
      }
      return { error: toQueryError(error) };
    }
  }

  return { error: { status: 'CUSTOM_ERROR', error: 'Request failed after retries' } };
};

export async function registerFcmToken(userId: string, token: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('user_fcm_tokens').upsert(
    {
      user_id: userId,
      token,
      platform: 'mobile',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,token' },
  );
}
