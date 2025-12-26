import React from 'react';
import { View, ViewProps } from 'react-native';

interface HStackProps extends ViewProps {
  className?: string;
  space?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  reversed?: boolean;
}

const spaceClasses = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4',
  xl: 'gap-6',
  '2xl': 'gap-8',
};

export function HStack({ className = '', space = 'md', reversed, ...props }: HStackProps) {
  const spaceClass = spaceClasses[space];
  const reverseClass = reversed ? 'flex-row-reverse' : 'flex-row';

  return (
    <View
      className={`${reverseClass} ${spaceClass} ${className}`}
      {...props}
    />
  );
}
