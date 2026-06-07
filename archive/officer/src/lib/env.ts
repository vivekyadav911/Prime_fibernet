import Constants from 'expo-constants';
import { parseEnvConfig, type EnvConfig } from '@prime/api-client';

function readExtra(key: string): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  return extra?.[key] ?? process.env[key];
}

export function getEnvConfig(): EnvConfig {
  return parseEnvConfig({
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? readExtra('EXPO_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? readExtra('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
    appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? readExtra('EXPO_PUBLIC_APP_ENV') ?? 'development',
  });
}
