import Constants from 'expo-constants';
import { parseEnvConfig, type EnvConfig } from '@prime/api-client';

export function getEnvConfig(): EnvConfig {
  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  return parseEnvConfig({
    supabaseUrl:
      process.env.EXPO_PUBLIC_SUPABASE_URL ??
      extra?.supabaseUrl ??
      'https://placeholder.supabase.co',
    supabaseAnonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra?.supabaseAnonKey ?? 'placeholder-anon-key',
    appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? extra?.appEnv ?? 'development',
  });
}
