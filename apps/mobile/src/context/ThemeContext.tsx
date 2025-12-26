import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const THEME_KEY = 'billmanager_theme';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Backgrounds
  background: string;
  surface: string;
  card: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;

  // Accent colors
  primary: string;
  primaryLight: string;
  success: string;
  danger: string;
  warning: string;

  // Borders
  border: string;
  borderLight: string;

  // Status bar
  statusBar: 'light' | 'dark';
}

const darkTheme: ThemeColors = {
  background: '#1a1a2e',
  surface: '#16213e',
  card: '#16213e',
  text: '#ffffff',
  textSecondary: '#cccccc',
  textMuted: '#888888',
  // Primary now uses billGreen to match web app
  primary: '#10b981',
  primaryLight: '#34d399',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  border: '#0f3460',
  borderLight: '#2a2a4e',
  statusBar: 'light',
};

const lightTheme: ThemeColors = {
  background: '#f5f5f5',
  surface: '#ffffff',
  card: '#ffffff',
  text: '#1a1a2e',
  textSecondary: '#444444',
  textMuted: '#666666',
  // Primary now uses billGreen to match web app
  primary: '#10b981',
  primaryLight: '#34d399',
  success: '#059669',
  danger: '#dc2626',
  warning: '#d97706',
  border: '#dddddd',
  borderLight: '#eeeeee',
  statusBar: 'dark',
};

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await SecureStore.getItemAsync(THEME_KEY);
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        setThemeModeState(saved as ThemeMode);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await SecureStore.setItemAsync(THEME_KEY, mode);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  // Determine if we should use dark mode
  const isDark = themeMode === 'dark' ||
    (themeMode === 'system' && systemColorScheme === 'dark');

  const colors = isDark ? darkTheme : lightTheme;

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, colors, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
