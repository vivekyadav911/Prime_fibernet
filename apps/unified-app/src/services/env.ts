import Constants from 'expo-constants';
import { parseEnvConfig, type EnvConfig } from '@prime/api-client';

export function getEnvConfig(): EnvConfig {
  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra?.supabaseUrl;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra?.supabaseAnonKey;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase config. Copy .env.example to apps/unified-app/.env and set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  return parseEnvConfig({
    supabaseUrl,
    supabaseAnonKey,
    appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? extra?.appEnv ?? 'development',
  });
}
