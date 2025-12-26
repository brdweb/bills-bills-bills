import React from 'react';
import { View, Text } from 'react-native';

interface BadgeProps {
  className?: string;
  variant?: 'solid' | 'outline';
  action?: 'info' | 'success' | 'warning' | 'error' | 'muted';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}

const variantClasses = {
  solid: {
    info: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-danger',
    muted: 'bg-border',
  },
  outline: {
    info: 'border border-primary bg-transparent',
    success: 'border border-success bg-transparent',
    warning: 'border border-warning bg-transparent',
    error: 'border border-danger bg-transparent',
    muted: 'border border-border bg-transparent',
  },
};

const textClasses = {
  solid: 'text-white',
  outline: {
    info: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-danger',
    muted: 'text-muted',
  },
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5',
  md: 'px-2 py-1',
  lg: 'px-3 py-1.5',
};

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-xs',
  lg: 'text-sm',
};

export function Badge({
  className = '',
  variant = 'solid',
  action = 'info',
  size = 'md',
  children,
}: BadgeProps) {
  const variantClass = variantClasses[variant][action];
  const sizeClass = sizeClasses[size];
  const textClass = variant === 'solid'
    ? textClasses.solid
    : textClasses.outline[action];
  const textSize = textSizeClasses[size];

  return (
    <View className={`rounded ${variantClass} ${sizeClass} ${className}`}>
      {typeof children === 'string' ? (
        <Text className={`font-medium ${textClass} ${textSize}`}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

export function BadgeText({ className = '', children, ...props }: any) {
  return (
    <Text className={`font-medium text-xs ${className}`} {...props}>
      {children}
    </Text>
  );
}
