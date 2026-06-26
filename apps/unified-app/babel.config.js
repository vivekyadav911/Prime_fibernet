const path = require('path');

const appRoot = __dirname;

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Metro serves web as a classic script bundle, not an ES module.
          // Transform import.meta (e.g. zustand/middleware ESM) to globalThis.__ExpoImportMetaRegistry.
          web: {
            unstable_transformImportMeta: true,
          },
        },
      ],
    ],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: [appRoot],
          alias: {
            '@': path.join(appRoot, 'src'),
          },
          extensions: [
            '.ios.ts',
            '.android.ts',
            '.ts',
            '.ios.tsx',
            '.android.tsx',
            '.tsx',
            '.js',
            '.jsx',
            '.json',
          ],
        },
      ],
    ],
  };
};
