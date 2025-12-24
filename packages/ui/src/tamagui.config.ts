import { createTamagui } from 'tamagui';
import { createInterFont } from '@tamagui/font-inter';
import { shorthands } from '@tamagui/shorthands';
import { createAnimations } from '@tamagui/animations-react-native';

import { tokens } from './theme/tokens';
import { darkTheme, lightTheme, billGreenTheme } from './theme/themes';

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
  tooltip: {
    type: 'spring',
    damping: 10,
    mass: 0.9,
    stiffness: 100,
  },
});

const headingFont = createInterFont({
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 36,
    10: 40,
  },
  weight: {
    4: '600',
    5: '600',
    6: '700',
    7: '700',
  },
  face: {
    600: { normal: 'InterSemiBold' },
    700: { normal: 'InterBold' },
  },
});

const bodyFont = createInterFont({
  size: {
    1: 11,
    2: 12,
    3: 13,
    4: 14,
    5: 16,
    6: 18,
    7: 20,
    8: 22,
    9: 24,
    10: 26,
  },
  weight: {
    1: '400',
    2: '400',
    3: '500',
    4: '500',
    5: '600',
    6: '600',
  },
  face: {
    400: { normal: 'Inter' },
    500: { normal: 'InterMedium' },
    600: { normal: 'InterSemiBold' },
  },
});

export const config = createTamagui({
  defaultTheme: 'dark',
  shouldAddPrefersColorThemes: true,
  themeClassNameOnRoot: true,
  shorthands,
  fonts: {
    heading: headingFont,
    body: bodyFont,
  },
  themes: {
    dark: darkTheme,
    light: lightTheme,
    billGreen: billGreenTheme,
  },
  tokens,
  animations,
  media: {
    xs: { maxWidth: 480 },
    sm: { maxWidth: 640 },
    md: { maxWidth: 768 },
    lg: { maxWidth: 1024 },
    xl: { maxWidth: 1280 },
    xxl: { maxWidth: 1536 },
    gtXs: { minWidth: 481 },
    gtSm: { minWidth: 641 },
    gtMd: { minWidth: 769 },
    gtLg: { minWidth: 1025 },
    short: { maxHeight: 820 },
    tall: { minHeight: 820 },
    hoverNone: { hover: 'none' },
    pointerCoarse: { pointer: 'coarse' },
  },
});

export default config;

export type AppConfig = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}
