import React from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  Text,
} from 'react-native';

interface InputProps extends TextInputProps {
  className?: string;
  variant?: 'outline' | 'filled' | 'underlined';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isInvalid?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
}

const variantClasses = {
  outline: 'bg-surface border border-border rounded-lg',
  filled: 'bg-surface rounded-lg',
  underlined: 'bg-transparent border-b border-border',
};

const sizeClasses = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-base',
  lg: 'px-4 py-4 text-lg',
  xl: 'px-5 py-5 text-xl',
};

export function Input({
  className = '',
  variant = 'outline',
  size = 'md',
  isInvalid,
  isDisabled,
  isReadOnly,
  ...props
}: InputProps) {
  const variantClass = variantClasses[variant];
  const sizeClass = sizeClasses[size];
  const invalidClass = isInvalid ? 'border-danger' : '';
  const disabledClass = isDisabled ? 'opacity-50' : '';

  return (
    <TextInput
      className={`text-white ${variantClass} ${sizeClass} ${invalidClass} ${disabledClass} ${className}`}
      placeholderTextColor="#888888"
      editable={!isDisabled && !isReadOnly}
      {...props}
    />
  );
}

// Input field wrapper with label
interface InputFieldProps extends InputProps {
  label?: string;
  helperText?: string;
  errorText?: string;
}

export function InputField({
  label,
  helperText,
  errorText,
  isInvalid,
  ...props
}: InputFieldProps) {
  return (
    <View className="mb-4">
      {label && (
        <Text className="text-muted text-sm mb-2">{label}</Text>
      )}
      <Input isInvalid={isInvalid || !!errorText} {...props} />
      {errorText && (
        <Text className="text-danger text-xs mt-1">{errorText}</Text>
      )}
      {helperText && !errorText && (
        <Text className="text-muted text-xs mt-1">{helperText}</Text>
      )}
    </View>
  );
}
