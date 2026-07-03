const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

require('dotenv').config({
  path: path.join(__dirname, 'apps/unified-app/.env'),
});

const monorepoRoot = __dirname;
const appRoot = path.join(monorepoRoot, 'apps/unified-app');

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
  'react-native-qrcode-svg': path.join(
    monorepoRoot,
    'node_modules/react-native-qrcode-svg',
  ),
  qrcode: path.join(monorepoRoot, 'node_modules/qrcode'),
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
  // Prefer CJS builds on web — zustand's ESM middleware uses import.meta, which breaks Metro web bundles.
  if (platform === 'web' && (moduleName === 'zustand' || moduleName.startsWith('zustand/'))) {
    const subpath =
      moduleName === 'zustand' ? 'index.js' : `${moduleName.slice('zustand/'.length)}.js`;
    return {
      filePath: path.join(monorepoRoot, 'node_modules/zustand', subpath),
      type: 'sourceFile',
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
