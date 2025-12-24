import { Text, styled, Stack, type GetProps } from 'tamagui';

const FABContainer = styled(Stack, {
  position: 'absolute',
  right: 20,
  bottom: 30,
  width: 56,
  height: 56,
  borderRadius: 28,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '$primary',
  zIndex: '$5',

  // Shadow
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,

  pressStyle: {
    opacity: 0.8,
    scale: 0.95,
  },

  variants: {
    size: {
      small: {
        width: 40,
        height: 40,
        borderRadius: 20,
      },
      medium: {
        width: 56,
        height: 56,
        borderRadius: 28,
      },
      large: {
        width: 72,
        height: 72,
        borderRadius: 36,
      },
    },
    variant: {
      primary: {
        backgroundColor: '$primary',
      },
      success: {
        backgroundColor: '$success',
      },
      danger: {
        backgroundColor: '$danger',
      },
    },
  } as const,

  defaultVariants: {
    size: 'medium',
    variant: 'primary',
  },
});

const FABIcon = styled(Text, {
  fontSize: 28,
  color: 'white',
  marginTop: -2,
});

export type FABProps = GetProps<typeof FABContainer> & {
  icon?: string;
  onPress?: () => void;
};

export function FAB({
  icon = '+',
  onPress,
  ...props
}: FABProps) {
  return (
    <FABContainer onPress={onPress} {...props}>
      <FABIcon>{icon}</FABIcon>
    </FABContainer>
  );
}

export default FAB;
