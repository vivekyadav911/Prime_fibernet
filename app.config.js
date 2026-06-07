const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, 'apps/unified-app/.env'),
});

const appJson = require('./apps/unified-app/app.json');

/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => {
  const base = appJson.expo;

  return {
    ...config,
    ...base,
    extra: {
      ...base.extra,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
    },
    plugins: [...(base.plugins ?? []), '@sentry/react-native'],
  };
};
