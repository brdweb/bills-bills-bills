import { Input, Label, YStack, Text, styled, type GetProps } from 'tamagui';

const StyledInput = styled(Input, {
  backgroundColor: '$surface',
  borderColor: '$border',
  borderWidth: 1,
  borderRadius: '$2',
  paddingHorizontal: '$4',
  paddingVertical: '$3',
  fontSize: 16,
  color: '$text',

  focusStyle: {
    borderColor: '$primary',
    outlineWidth: 0,
  },

  variants: {
    error: {
      true: {
        borderColor: '$danger',
      },
    },
    disabled: {
      true: {
        opacity: 0.5,
      },
    },
  } as const,
});

export type FormInputProps = GetProps<typeof StyledInput> & {
  label?: string;
  error?: string;
  helperText?: string;
};

export function FormInput({
  label,
  error,
  helperText,
  ...inputProps
}: FormInputProps) {
  return (
    <YStack gap="$1" marginBottom="$3">
      {label && (
        <Label htmlFor={inputProps.id} color="$text" fontSize={14}>
          {label}
        </Label>
      )}
      <StyledInput
        error={!!error}
        placeholderTextColor="$textMuted"
        {...inputProps}
      />
      {error && (
        <Text color="$danger" fontSize={12}>
          {error}
        </Text>
      )}
      {helperText && !error && (
        <Text color="$textMuted" fontSize={12}>
          {helperText}
        </Text>
      )}
    </YStack>
  );
}

export default FormInput;
