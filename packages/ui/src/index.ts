// @billmanager/ui - Shared UI components and theme for BillManager
// Works on both React Native (Expo) and Web (Vite)

// Theme exports (tokens and themes only - each platform creates its own config)
export * from './theme';

// Component exports
export * from './components';

// Note: Each platform should create its own tamagui.config.ts that:
// - Uses @tamagui/animations-react-native for React Native
// - Uses @tamagui/animations-css for Web
// Import tokens, themes from this package, then create the config locally.
