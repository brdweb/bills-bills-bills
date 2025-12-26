import React from 'react';
import { View, ViewProps } from 'react-native';
import { cssInterop } from 'nativewind';

// Enable cssInterop for View
cssInterop(View, { className: 'style' });

type GluestackUIProviderProps = {
  children: React.ReactNode;
  mode?: 'light' | 'dark';
};

export function GluestackUIProvider({ children, mode = 'dark' }: GluestackUIProviderProps) {
  return <>{children}</>;
}
