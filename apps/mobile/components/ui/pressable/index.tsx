import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';

interface PressableProps extends TouchableOpacityProps {
  className?: string;
  isDisabled?: boolean;
}

export function Pressable({
  className = '',
  isDisabled,
  ...props
}: PressableProps) {
  const disabledClass = isDisabled ? 'opacity-50' : '';

  return (
    <TouchableOpacity
      className={`${disabledClass} ${className}`}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...props}
    />
  );
}
