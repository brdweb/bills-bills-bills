import { createTokens } from 'tamagui';

// Color palette combining mobile and web themes
export const tokens = createTokens({
  color: {
    // Base colors (from mobile dark theme)
    background: '#1a1a2e',
    backgroundLight: '#f5f5f5',
    surface: '#16213e',
    surfaceLight: '#ffffff',
    card: '#16213e',
    cardLight: '#ffffff',

    // Text colors
    text: '#ffffff',
    textLight: '#1a1a2e',
    textSecondary: '#cccccc',
    textSecondaryLight: '#444444',
    textMuted: '#888888',
    textMutedLight: '#666666',

    // Primary brand color (mobile)
    primary: '#e94560',
    primaryLight: '#ff6b6b',

    // BillGreen brand color (web)
    billGreen50: '#ecfdf5',
    billGreen100: '#d1fae5',
    billGreen200: '#a7f3d0',
    billGreen300: '#6ee7b7',
    billGreen400: '#34d399',
    billGreen500: '#10b981',
    billGreen600: '#059669',
    billGreen700: '#047857',
    billGreen800: '#065f46',
    billGreen900: '#064e3b',

    // Semantic colors
    success: '#44aa44',
    successLight: '#2d8a2d',
    danger: '#ff4444',
    dangerLight: '#cc3333',
    warning: '#ffcc00',
    warningLight: '#cc9900',

    // Border colors
    border: '#0f3460',
    borderLight: '#dddddd',
    borderLighter: '#eeeeee',

    // Status colors for due dates
    statusOverdue: '#ff4444',
    statusDueToday: '#ff8800',
    statusDueSoon: '#ffcc00',
    statusOk: '#44aa44',

    // Transparent
    transparent: 'transparent',
    white: '#ffffff',
    black: '#000000',
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

export type Tokens = typeof tokens;
