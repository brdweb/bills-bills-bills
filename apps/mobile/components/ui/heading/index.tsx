import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';

interface HeadingProps extends RNTextProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
  '2xl': 'text-4xl',
  '3xl': 'text-5xl',
  '4xl': 'text-6xl',
};

export function Heading({ className = '', size = 'lg', ...props }: HeadingProps) {
  const sizeClass = sizeClasses[size];

  return (
    <RNText
      className={`text-white font-bold ${sizeClass} ${className}`}
      {...props}
    />
  );
}
