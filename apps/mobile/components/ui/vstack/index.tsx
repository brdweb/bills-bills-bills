import React from 'react';
import { View, ViewProps } from 'react-native';

interface VStackProps extends ViewProps {
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

export function VStack({ className = '', space = 'md', reversed, ...props }: VStackProps) {
  const spaceClass = spaceClasses[space];
  const reverseClass = reversed ? 'flex-col-reverse' : 'flex-col';

  return (
    <View
      className={`${reverseClass} ${spaceClass} ${className}`}
      {...props}
    />
  );
}
