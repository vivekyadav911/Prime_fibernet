const path = require('path');

const appRoot = __dirname;

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: [appRoot],
          alias: {
            '@': path.join(appRoot, 'src'),
          },
        },
      ],
    ],
  };
};
