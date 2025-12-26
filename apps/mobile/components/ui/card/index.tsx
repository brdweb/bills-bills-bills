import React from 'react';
import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  className?: string;
  variant?: 'elevated' | 'outline' | 'ghost' | 'filled';
  size?: 'sm' | 'md' | 'lg';
}

const variantClasses = {
  elevated: 'bg-surface rounded-xl shadow-lg',
  outline: 'bg-surface border border-border rounded-xl',
  ghost: 'bg-transparent',
  filled: 'bg-surface rounded-xl',
};

const sizeClasses = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  className = '',
  variant = 'filled',
  size = 'md',
  ...props
}: CardProps) {
  const variantClass = variantClasses[variant];
  const sizeClass = sizeClasses[size];

  return (
    <View className={`${variantClass} ${sizeClass} ${className}`} {...props} />
  );
}
