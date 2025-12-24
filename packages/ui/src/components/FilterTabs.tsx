import { XStack, Text, styled } from 'tamagui';

const TabContainer = styled(XStack, {
  gap: '$2',
  marginTop: '$3',
});

const TabButton = styled(XStack, {
  flex: 1,
  paddingVertical: '$2',
  borderRadius: '$2',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$background',

  pressStyle: {
    opacity: 0.8,
  },

  variants: {
    active: {
      true: {},
      false: {},
    },
    variant: {
      default: {},
      danger: {},
      success: {},
    },
  } as const,
});

const TabText = styled(Text, {
  fontSize: 13,
  fontWeight: '500',
  color: '$text',

  variants: {
    active: {
      true: {
        color: 'white',
      },
    },
  } as const,
});

export interface FilterTabOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  variant?: 'default' | 'danger' | 'success';
}

export interface FilterTabsProps<T extends string> {
  options: FilterTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
}: FilterTabsProps<T>) {
  const getActiveBackgroundColor = (
    variant: 'default' | 'danger' | 'success' = 'default'
  ): string => {
    switch (variant) {
      case 'danger':
        return '$danger';
      case 'success':
        return '$success';
      default:
        return '$primary';
    }
  };

  return (
    <TabContainer>
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <TabButton
            key={option.value}
            active={isActive}
            onPress={() => onChange(option.value)}
            backgroundColor={isActive ? getActiveBackgroundColor(option.variant) : '$background'}
          >
            <TabText active={isActive}>
              {option.label}
              {option.count !== undefined && ` (${option.count})`}
            </TabText>
          </TabButton>
        );
      })}
    </TabContainer>
  );
}

export default FilterTabs;
