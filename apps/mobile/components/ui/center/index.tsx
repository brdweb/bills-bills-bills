import React from 'react';
import { View, ViewProps } from 'react-native';

interface CenterProps extends ViewProps {
  className?: string;
}

export function Center({ className = '', ...props }: CenterProps) {
  return (
    <View
      className={`items-center justify-center ${className}`}
      {...props}
    />
  );
}
