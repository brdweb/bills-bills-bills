import React from 'react';
import { ActivityIndicator, ActivityIndicatorProps } from 'react-native';

interface SpinnerProps extends Omit<ActivityIndicatorProps, 'size'> {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'small' as const,
  md: 'small' as const,
  lg: 'large' as const,
};

export function Spinner({
  className = '',
  size = 'md',
  color = '#e94560',
  ...props
}: SpinnerProps) {
  return (
    <ActivityIndicator
      size={sizeMap[size]}
      color={color}
      {...props}
    />
  );
}
