const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const packagesRoot = path.resolve(monorepoRoot, 'packages');

const config = getDefaultConfig(projectRoot);

// Only watch the packages directory specifically, not the whole monorepo
config.watchFolders = [packagesRoot];

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Disable package exports for Tamagui packages to fix Expo 53+ compatibility
config.resolver.unstable_enablePackageExports = false;

// Force all tamagui-related imports to resolve from mobile's node_modules
// This prevents duplicate context issues in monorepo
const mobileNodeModules = path.resolve(projectRoot, 'node_modules');
config.resolver.extraNodeModules = {
  'tamagui': path.resolve(mobileNodeModules, 'tamagui'),
  '@tamagui/core': path.resolve(mobileNodeModules, '@tamagui/core'),
  '@tamagui/web': path.resolve(mobileNodeModules, '@tamagui/web'),
  'react': path.resolve(mobileNodeModules, 'react'),
  'react-native': path.resolve(mobileNodeModules, 'react-native'),
};

module.exports = config;
