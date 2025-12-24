import { createTheme } from 'tamagui';
import { tokens } from './tokens';

// Dark theme (default for mobile)
export const darkTheme = createTheme({
  background: tokens.color.background,
  backgroundHover: tokens.color.surface,
  backgroundPress: tokens.color.border,
  backgroundFocus: tokens.color.surface,

  color: tokens.color.text,
  colorHover: tokens.color.text,
  colorPress: tokens.color.textSecondary,
  colorFocus: tokens.color.text,

  borderColor: tokens.color.border,
  borderColorHover: tokens.color.primary,
  borderColorFocus: tokens.color.primary,
  borderColorPress: tokens.color.border,

  placeholderColor: tokens.color.textMuted,

  // Semantic
  primary: tokens.color.primary,
  primaryHover: tokens.color.primaryLight,

  success: tokens.color.success,
  danger: tokens.color.danger,
  warning: tokens.color.warning,

  // Surfaces
  surface: tokens.color.surface,
  card: tokens.color.card,

  // Text variants
  textMuted: tokens.color.textMuted,
  textSecondary: tokens.color.textSecondary,
});

// Light theme
export const lightTheme = createTheme({
  background: tokens.color.backgroundLight,
  backgroundHover: tokens.color.surfaceLight,
  backgroundPress: tokens.color.borderLight,
  backgroundFocus: tokens.color.surfaceLight,

  color: tokens.color.textLight,
  colorHover: tokens.color.textLight,
  colorPress: tokens.color.textSecondaryLight,
  colorFocus: tokens.color.textLight,

  borderColor: tokens.color.borderLight,
  borderColorHover: tokens.color.primary,
  borderColorFocus: tokens.color.primary,
  borderColorPress: tokens.color.borderLight,

  placeholderColor: tokens.color.textMutedLight,

  // Semantic
  primary: tokens.color.primary,
  primaryHover: tokens.color.primaryLight,

  success: tokens.color.successLight,
  danger: tokens.color.dangerLight,
  warning: tokens.color.warningLight,

  // Surfaces
  surface: tokens.color.surfaceLight,
  card: tokens.color.cardLight,

  // Text variants
  textMuted: tokens.color.textMutedLight,
  textSecondary: tokens.color.textSecondaryLight,
});

// BillGreen theme variant (for web branding)
export const billGreenTheme = createTheme({
  ...lightTheme,
  primary: tokens.color.billGreen500,
  primaryHover: tokens.color.billGreen600,
});

export type Theme = typeof darkTheme;
