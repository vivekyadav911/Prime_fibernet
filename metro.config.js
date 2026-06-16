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
config.resolver.alias = {
  '@': path.join(appRoot, 'src'),
};

module.exports = config;
