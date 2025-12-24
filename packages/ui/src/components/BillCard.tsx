import { XStack, YStack, Text, styled } from 'tamagui';

// Helper functions
const formatCurrency = (amount: number | null): string => {
  if (amount === null) return 'Variable';
  return `$${amount.toFixed(2)}`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getDaysUntilDue = (dueDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getStatusColor = (dueDate: string): string => {
  const days = getDaysUntilDue(dueDate);
  if (days < 0) return '#ff4444'; // Overdue
  if (days === 0) return '#ff8800'; // Due today
  if (days <= 3) return '#ffcc00'; // Due soon
  return '#44aa44'; // OK
};

const getStatusText = (dueDate: string): string => {
  const days = getDaysUntilDue(dueDate);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days}d`;
};

const CardContainer = styled(XStack, {
  backgroundColor: '$surface',
  borderRadius: '$3',
  padding: '$4',
  marginBottom: '$3',
  alignItems: 'center',

  pressStyle: {
    opacity: 0.8,
  },
});

const StatusIndicator = styled(YStack, {
  width: 4,
  borderRadius: '$1',
  marginRight: '$3',
  minHeight: 40,
  alignSelf: 'stretch',
});

const BillInfo = styled(YStack, {
  flex: 1,
});

const BillName = styled(Text, {
  fontSize: 16,
  fontWeight: '600',
  color: '$text',
});

const BillMeta = styled(Text, {
  fontSize: 12,
  marginTop: '$1',
  color: '$textMuted',
});

const AmountContainer = styled(YStack, {
  alignItems: 'flex-end',
});

const StatusText = styled(Text, {
  fontSize: 11,
  marginTop: '$1',
});

export interface BillData {
  id: number;
  name: string;
  amount: number | null;
  next_due: string;
  frequency: string;
  type: 'expense' | 'deposit';
  account?: string;
  notes?: string;
}

export interface BillCardProps {
  bill: BillData;
  onPress?: (bill: BillData) => void;
}

export function BillCard({ bill, onPress }: BillCardProps) {
  const statusColor = getStatusColor(bill.next_due);
  const statusText = getStatusText(bill.next_due);

  return (
    <CardContainer
      onPress={() => onPress?.(bill)}
      pressStyle={{ opacity: 0.8 }}
    >
      <StatusIndicator backgroundColor={statusColor} />
      <BillInfo>
        <BillName>{bill.name}</BillName>
        <BillMeta>
          {formatDate(bill.next_due)} • {bill.frequency}
          {bill.account && ` • ${bill.account}`}
        </BillMeta>
      </BillInfo>
      <AmountContainer>
        <Text
          fontSize={16}
          fontWeight="600"
          color={bill.type === 'deposit' ? '$success' : '$danger'}
        >
          {bill.type === 'deposit' ? '+' : '-'}{formatCurrency(bill.amount)}
        </Text>
        <StatusText color={statusColor}>{statusText}</StatusText>
      </AmountContainer>
    </CardContainer>
  );
}

export default BillCard;
