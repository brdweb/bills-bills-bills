import React from 'react';
import { Switch as RNSwitch, SwitchProps as RNSwitchProps } from 'react-native';

interface SwitchProps extends Omit<RNSwitchProps, 'value' | 'onValueChange'> {
  className?: string;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  isDisabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Switch({
  className = '',
  value,
  onValueChange,
  isDisabled,
  ...props
}: SwitchProps) {
  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={isDisabled}
      trackColor={{ false: '#0f3460', true: '#e94560' }}
      thumbColor="white"
      {...props}
    />
  );
}
