/** @type {import('expo/config').ExpoConfig} */
export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
  },
  plugins: [
    ...(config.plugins ?? []),
    '@sentry/react-native',
  ],
});
