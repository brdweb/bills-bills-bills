import { TamaguiProvider as TamaguiProviderBase, Theme } from 'tamagui';
import { useEffect, useState, type ReactNode } from 'react';
import config from './tamagui.config';

// Load Tamagui CSS
import '@tamagui/font-inter/css/400.css';
import '@tamagui/font-inter/css/500.css';
import '@tamagui/font-inter/css/600.css';
import '@tamagui/font-inter/css/700.css';

interface TamaguiProviderProps {
  children: ReactNode;
}

type ThemeName = 'light' | 'dark' | 'billGreen';

export function TamaguiProvider({ children }: TamaguiProviderProps) {
  // Track system/user color scheme preference
  const [themeName, setThemeName] = useState<ThemeName>('light');

  useEffect(() => {
    // Check for system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = () => {
      // For now, default to billGreen theme (BillManager brand) in light mode
      // and dark theme in dark mode
      setThemeName(mediaQuery.matches ? 'dark' : 'billGreen');
    };

    updateTheme();
    mediaQuery.addEventListener('change', updateTheme);
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, []);

  return (
    <TamaguiProviderBase config={config} defaultTheme={themeName}>
      <Theme name={themeName}>
        {children}
      </Theme>
    </TamaguiProviderBase>
  );
}

export default TamaguiProvider;
