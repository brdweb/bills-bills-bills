// Shared UI Components for BillManager
// These components work on both React Native and Web via Tamagui

// Re-export Tamagui primitives that we commonly use
export {
  Button,
  Card,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Input,
  Label,
  Paragraph,
  Separator,
  Sheet,
  Spinner,
  Switch,
  Text,
  TextArea,
  XStack,
  YStack,
  ScrollView,
  Theme as TamaguiTheme,
  useTheme,
} from 'tamagui';

// Custom components
export { FormInput } from './FormInput';
export type { FormInputProps } from './FormInput';

export { BillCard } from './BillCard';
export type { BillCardProps, BillData } from './BillCard';

export { FilterTabs } from './FilterTabs';
export type { FilterTabsProps, FilterTabOption } from './FilterTabs';

export { FAB } from './FAB';
export type { FABProps } from './FAB';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

// Components to be added:
// export { PaymentCard } from './PaymentCard';
// export { StatCard } from './StatCard';
// export { FormSelect } from './FormSelect';
// export { Badge } from './Badge';
// export { Modal } from './Modal';
// export { MiniBarChart } from './MiniBarChart';
