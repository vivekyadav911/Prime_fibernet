/** @type {import('expo/config').ExpoConfig} */
export default ({ config }) => ({
  ...config,
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  extra: {
    ...config.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
    appVariant: process.env.EXPO_PUBLIC_APP_VARIANT ?? 'unified',
    razorpayKeyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID,
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
  plugins: [
    ...(config.plugins ?? []),
    '@react-native-community/datetimepicker',
    '@sentry/react-native',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Prime Fibernet needs background location during active officer shifts for live field tracking.',
        locationWhenInUsePermission:
          'Prime Fibernet uses your location for officer shift check-in/out and field tracking.',
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Prime Fibernet accesses your photos for profile pictures and service request attachments.',
        cameraPermission:
          'Prime Fibernet uses the camera to capture profile photos and service request attachments.',
      },
    ],
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'Prime Fibernet uses Face ID to securely unlock the app after sign-in.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#1B3A6B',
        mode: 'production',
      },
    ],
    'expo-task-manager',
  ],
  android: {
    ...(config.android ?? {}),
    config: {
      ...(config.android?.config ?? {}),
      googleMaps: {
        ...(config.android?.config?.googleMaps ?? {}),
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
  },
  ios: {
    ...(config.ios ?? {}),
    config: {
      ...(config.ios?.config ?? {}),
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
    infoPlist: {
      ...(config.ios?.infoPlist ?? {}),
      UIBackgroundModes: ['location', 'fetch', 'remote-notification'],
    },
  },
});
