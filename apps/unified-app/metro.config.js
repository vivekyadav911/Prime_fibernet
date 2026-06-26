const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const appRoot = __dirname;
const monorepoRoot = path.resolve(appRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(appRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.join(appRoot, 'node_modules'),
  path.join(monorepoRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  '@expo-google-fonts/hanken-grotesk': path.join(
    monorepoRoot,
    'node_modules/@expo-google-fonts/hanken-grotesk',
  ),
  'react-native-signature-canvas': path.join(
    monorepoRoot,
    'node_modules/react-native-signature-canvas',
  ),
  jspdf: path.join(monorepoRoot, 'node_modules/jspdf'),
  html2canvas: path.join(monorepoRoot, 'node_modules/html2canvas'),
};
config.resolver.alias = {
  '@': path.join(appRoot, 'src'),
};

const mapsShimPath = path.join(appRoot, 'src/shims/react-native-maps.tsx');
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      filePath: mapsShimPath,
      type: 'sourceFile',
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
