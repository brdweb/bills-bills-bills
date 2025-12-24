import { YStack, Text, styled } from 'tamagui';

const Container = styled(YStack, {
  alignItems: 'center',
  paddingTop: '$10',
  paddingHorizontal: '$4',
});

const Title = styled(Text, {
  fontSize: 18,
  marginBottom: '$2',
  color: '$textMuted',
  textAlign: 'center',
});

const Subtitle = styled(Text, {
  fontSize: 14,
  color: '$textMuted',
  textAlign: 'center',
});

const Icon = styled(Text, {
  fontSize: 48,
  marginBottom: '$4',
});

export interface EmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: string;
}

export function EmptyState({ title, subtitle, icon }: EmptyStateProps) {
  return (
    <Container>
      {icon && <Icon>{icon}</Icon>}
      <Title>{title}</Title>
      {subtitle && <Subtitle>{subtitle}</Subtitle>}
    </Container>
  );
}

export default EmptyState;
