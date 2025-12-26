import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';

interface TextProps extends RNTextProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  bold?: boolean;
}

const sizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
};

export function Text({ className = '', size = 'md', bold, ...props }: TextProps) {
  const sizeClass = sizeClasses[size];
  const boldClass = bold ? 'font-bold' : '';

  // Only apply default text-white if no text color class is provided
  const hasColorClass = /text-(success|danger|warning|primary|muted|white|black|billGreen)/.test(className);
  const defaultColor = hasColorClass ? '' : 'text-white';

  return (
    <RNText
      className={`${defaultColor} ${sizeClass} ${boldClass} ${className}`.trim()}
      {...props}
    />
  );
}
