import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EnvConfig, EnvConfigSchema } from '@prime/types';

export type SupabaseStorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export function parseEnvConfig(raw: {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  appEnv?: string;
}): EnvConfig {
  return EnvConfigSchema.parse({
    supabaseUrl: raw.supabaseUrl,
    supabaseAnonKey: raw.supabaseAnonKey,
    appEnv: raw.appEnv ?? 'development',
  });
}

export function createSupabaseClient(
  config: EnvConfig,
  storage?: SupabaseStorageAdapter,
): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: Boolean(storage),
      detectSessionInUrl: false,
    },
  });
}

export { createClient };
export type { SupabaseClient };
export type { EnvConfig } from '@prime/types';
