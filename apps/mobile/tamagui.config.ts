import { createTamagui, createTokens } from 'tamagui';
import { shorthands } from '@tamagui/shorthands';
import { createAnimations } from '@tamagui/animations-react-native';
import { createMedia } from '@tamagui/react-native-media-driver';
import { createInterFont } from '@tamagui/font-inter';

// Custom tokens
const tokens = createTokens({
  color: {
    // Base colors
    white: '#ffffff',
    black: '#000000',
    transparent: 'transparent',

    // Dark theme colors
    background: '#1a1a2e',
    backgroundLight: '#f5f5f5',
    surface: '#16213e',
    surfaceLight: '#ffffff',
    text: '#ffffff',
    textLight: '#1a1a2e',
    textMuted: '#888888',
    textSecondary: '#aaaaaa',

    // Brand colors
    primary: '#e94560',
    primaryLight: '#ff6b6b',
    primaryDark: '#c73e54',

    // Semantic colors
    success: '#44aa44',
    successLight: '#66cc66',
    danger: '#ff4444',
    dangerLight: '#ff6666',
    warning: '#ffcc00',
    warningLight: '#ffdd44',
    info: '#3b82f6',
    infoLight: '#60a5fa',

    // Border colors
    border: '#0f3460',
    borderLight: '#e5e7eb',
  },
  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    true: 16,
  },
  size: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
    true: 16,
  },
  radius: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    true: 8,
  },
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
  },
});

// Animations
const animations = createAnimations({
  fast: {
    type: 'spring',
    damping: 20,
    mass: 1.2,
    stiffness: 250,
  },
  medium: {
    type: 'spring',
    damping: 10,
    mass: 0.9,
    stiffness: 100,
  },
  slow: {
    type: 'spring',
    damping: 20,
    stiffness: 60,
  },
  quick: {
    type: 'spring',
    damping: 20,
    mass: 1,
    stiffness: 300,
  },
});

// Fonts
const headingFont = createInterFont();
const bodyFont = createInterFont();

// Media queries
const media = createMedia({
  xs: { maxWidth: 660 },
  sm: { maxWidth: 800 },
  md: { maxWidth: 1020 },
  lg: { maxWidth: 1280 },
  xl: { maxWidth: 1420 },
  xxl: { maxWidth: 1600 },
  gtXs: { minWidth: 660 + 1 },
  gtSm: { minWidth: 800 + 1 },
  gtMd: { minWidth: 1020 + 1 },
  gtLg: { minWidth: 1280 + 1 },
  short: { maxHeight: 820 },
  tall: { minHeight: 820 },
  hoverNone: { hover: 'none' },
  pointerCoarse: { pointer: 'coarse' },
});

// Dark theme
const darkTheme = {
  background: tokens.color.background,
  backgroundHover: tokens.color.surface,
  backgroundPress: tokens.color.surface,
  backgroundFocus: tokens.color.surface,
  backgroundStrong: tokens.color.surface,
  backgroundTransparent: tokens.color.transparent,
  color: tokens.color.text,
  colorHover: tokens.color.text,
  colorPress: tokens.color.text,
  colorFocus: tokens.color.text,
  colorTransparent: tokens.color.transparent,
  borderColor: tokens.color.border,
  borderColorHover: tokens.color.primary,
  borderColorFocus: tokens.color.primary,
  borderColorPress: tokens.color.primary,
  placeholderColor: tokens.color.textMuted,
  outlineColor: tokens.color.primary,
  // Custom semantic mappings
  surface: tokens.color.surface,
  text: tokens.color.text,
  textMuted: tokens.color.textMuted,
  textSecondary: tokens.color.textSecondary,
  primary: tokens.color.primary,
  success: tokens.color.success,
  danger: tokens.color.danger,
  warning: tokens.color.warning,
  info: tokens.color.info,
  border: tokens.color.border,
};

// Light theme
const lightTheme = {
  background: tokens.color.backgroundLight,
  backgroundHover: tokens.color.surfaceLight,
  backgroundPress: tokens.color.surfaceLight,
  backgroundFocus: tokens.color.surfaceLight,
  backgroundStrong: tokens.color.surfaceLight,
  backgroundTransparent: tokens.color.transparent,
  color: tokens.color.textLight,
  colorHover: tokens.color.textLight,
  colorPress: tokens.color.textLight,
  colorFocus: tokens.color.textLight,
  colorTransparent: tokens.color.transparent,
  borderColor: tokens.color.borderLight,
  borderColorHover: tokens.color.primary,
  borderColorFocus: tokens.color.primary,
  borderColorPress: tokens.color.primary,
  placeholderColor: tokens.color.textMuted,
  outlineColor: tokens.color.primary,
  // Custom semantic mappings
  surface: tokens.color.surfaceLight,
  text: tokens.color.textLight,
  textMuted: tokens.color.textMuted,
  textSecondary: tokens.color.textSecondary,
  primary: tokens.color.primary,
  success: tokens.color.success,
  danger: tokens.color.danger,
  warning: tokens.color.warning,
  info: tokens.color.info,
  border: tokens.color.borderLight,
};

export const config = createTamagui({
  defaultTheme: 'dark',
  shouldAddPrefersColorThemes: false,
  themeClassNameOnRoot: false,
  shorthands,
  fonts: {
    heading: headingFont,
    body: bodyFont,
  },
  themes: {
    dark: darkTheme,
    light: lightTheme,
  },
  tokens,
  animations,
  media,
});

export default config;

export type AppConfig = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}
