import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  ActivityIndicator,
  Text,
} from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  className?: string;
  variant?: 'solid' | 'outline' | 'ghost';
  action?: 'primary' | 'secondary' | 'positive' | 'negative';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  isDisabled?: boolean;
  children?: React.ReactNode;
}

const variantClasses = {
  solid: {
    primary: 'bg-primary',
    secondary: 'bg-border',
    positive: 'bg-success',
    negative: 'bg-danger',
  },
  outline: {
    primary: 'border-2 border-primary bg-transparent',
    secondary: 'border-2 border-border bg-transparent',
    positive: 'border-2 border-success bg-transparent',
    negative: 'border-2 border-danger bg-transparent',
  },
  ghost: {
    primary: 'bg-transparent',
    secondary: 'bg-transparent',
    positive: 'bg-transparent',
    negative: 'bg-transparent',
  },
};

const textVariantClasses = {
  solid: 'text-white',
  outline: {
    primary: 'text-primary',
    secondary: 'text-muted',
    positive: 'text-success',
    negative: 'text-danger',
  },
  ghost: {
    primary: 'text-primary',
    secondary: 'text-muted',
    positive: 'text-success',
    negative: 'text-danger',
  },
};

const sizeClasses = {
  xs: 'px-2 py-1',
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
  lg: 'px-6 py-4',
  xl: 'px-8 py-5',
};

const textSizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

export function Button({
  className = '',
  variant = 'solid',
  action = 'primary',
  size = 'md',
  isLoading,
  isDisabled,
  children,
  ...props
}: ButtonProps) {
  const variantClass = typeof variantClasses[variant] === 'string'
    ? variantClasses[variant]
    : variantClasses[variant][action];
  const sizeClass = sizeClasses[size];
  const disabledClass = isDisabled || isLoading ? 'opacity-50' : '';

  const textClass = variant === 'solid'
    ? textVariantClasses.solid
    : textVariantClasses[variant][action];
  const textSize = textSizeClasses[size];

  return (
    <TouchableOpacity
      className={`rounded-lg items-center justify-center ${variantClass} ${sizeClass} ${disabledClass} ${className}`}
      disabled={isDisabled || isLoading}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color="white" size="small" />
      ) : typeof children === 'string' ? (
        <Text className={`font-semibold ${textClass} ${textSize}`}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

// Sub-components for more control
export function ButtonText({ className = '', children, ...props }: any) {
  return (
    <Text className={`font-semibold text-white ${className}`} {...props}>
      {children}
    </Text>
  );
}

export function ButtonSpinner({ className = '' }: { className?: string }) {
  return <ActivityIndicator color="white" size="small" />;
}

export function ButtonIcon({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
