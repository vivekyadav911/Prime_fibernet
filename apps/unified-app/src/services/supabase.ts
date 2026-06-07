import { createSupabaseClient } from '@prime/api-client';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getEnvConfig } from './env';
import { secureStorageAdapter } from './secureStorage';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    const config = getEnvConfig();
    client = createSupabaseClient(config, secureStorageAdapter);
  }
  return client;
}

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
