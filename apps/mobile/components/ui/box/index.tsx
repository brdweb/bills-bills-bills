import React from 'react';
import { View, ViewProps } from 'react-native';

interface BoxProps extends ViewProps {
  className?: string;
}

export function Box({ className = '', style, ...props }: BoxProps) {
  return <View className={className} style={style} {...props} />;
}
