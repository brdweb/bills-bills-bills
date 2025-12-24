import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { TamaguiProvider, Theme } from 'tamagui';

import { config } from './tamagui.config';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';

function AppContent() {
  const { isDark } = useTheme();

  return (
    <Theme name={isDark ? 'dark' : 'light'}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </Theme>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <TamaguiProvider config={config}>
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
