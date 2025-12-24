import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Modal as RNModal } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  YStack,
  XStack,
  Text,
  Button,
  Input,
  Spinner,
  ScrollView,
  styled,
  Separator,
} from 'tamagui';
import { api } from '../api/client';
import { Bill, Payment } from '../types';

type BillsStackParamList = {
  BillsList: undefined;
  BillDetail: { billId: number };
  AddBill: { bill?: Bill };
};

type Props = NativeStackScreenProps<BillsStackParamList, 'BillDetail'>;

// Helper functions
const formatCurrency = (amount: number | null): string => {
  if (amount === null) return 'Variable';
  return `$${amount.toFixed(2)}`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Styled components
const Container = styled(YStack, {
  flex: 1,
  backgroundColor: '$background',
});

const Header = styled(XStack, {
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: '$5',
  paddingTop: 60,
  backgroundColor: '$surface',
});

const HeaderTitle = styled(Text, {
  fontSize: 28,
  fontWeight: 'bold',
  color: '$text',
  paddingHorizontal: '$5',
  paddingBottom: '$5',
  backgroundColor: '$surface',
});

const Card = styled(YStack, {
  backgroundColor: '$surface',
  borderRadius: '$3',
  overflow: 'hidden',
});

const CardRow = styled(XStack, {
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '$4',
  borderBottomWidth: 1,
  borderBottomColor: '$border',
});

const Label = styled(Text, {
  fontSize: 14,
  color: '$textMuted',
});

const Value = styled(Text, {
  fontSize: 16,
  fontWeight: '500',
  color: '$text',
});

const ActionButton = styled(Button, {
  borderRadius: '$3',
  paddingVertical: '$4',

  pressStyle: {
    opacity: 0.8,
  },
});

const SectionTitle = styled(Text, {
  fontSize: 18,
  fontWeight: '600',
  color: '$text',
  marginBottom: '$3',
});

const PaymentRow = styled(XStack, {
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '$4',
  borderBottomWidth: 1,
  borderBottomColor: '$border',
});

const ModalOverlay = styled(YStack, {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.7)',
  justifyContent: 'flex-end',
});

const ModalContent = styled(YStack, {
  backgroundColor: '$surface',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: '$6',
  paddingBottom: 40,
});

const ModalInput = styled(Input, {
  backgroundColor: '$background',
  borderColor: '$border',
  borderWidth: 1,
  borderRadius: '$2',
  padding: '$4',
  fontSize: 18,
  color: '$text',
  marginBottom: '$6',
});

const CenteredContainer = styled(YStack, {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '$background',
});

export default function BillDetailScreen({ route, navigation }: Props) {
  const { billId } = route.params;
  const [bill, setBill] = useState<Bill | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBillData = useCallback(async () => {
    try {
      const [billRes, paymentsRes] = await Promise.all([
        api.getBill(billId),
        api.getPayments(billId),
      ]);

      if (billRes.success && billRes.data) {
        setBill(billRes.data);
        setPayAmount(billRes.data.amount?.toString() || '');
      } else {
        setError(billRes.error || 'Failed to load bill');
      }

      if (paymentsRes.success && paymentsRes.data) {
        setPayments(paymentsRes.data);
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  }, [billId]);

  useEffect(() => {
    fetchBillData();
  }, [fetchBillData]);

  useFocusEffect(
    useCallback(() => {
      fetchBillData();
    }, [fetchBillData])
  );

  const handlePay = async () => {
    if (!bill) return;

    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount');
      return;
    }

    setIsSubmitting(true);
    const today = new Date().toISOString().split('T')[0];
    const result = await api.recordPayment(bill.id, amount, today);

    if (result.success) {
      setShowPayModal(false);
      fetchBillData();
      Alert.alert('Success', 'Payment recorded successfully');
    } else {
      Alert.alert('Error', result.error || 'Failed to record payment');
    }
    setIsSubmitting(false);
  };

  const handleEdit = () => {
    if (bill) {
      navigation.navigate('AddBill', { bill });
    }
  };

  const handleArchive = () => {
    if (!bill) return;

    Alert.alert(
      'Archive Bill',
      `Are you sure you want to archive "${bill.name}"? You can unarchive it later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            const result = await api.archiveBill(bill.id);
            if (result.success) {
              navigation.goBack();
            } else {
              Alert.alert('Error', result.error || 'Failed to archive bill');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <CenteredContainer>
        <Spinner size="large" color="$primary" />
      </CenteredContainer>
    );
  }

  if (error || !bill) {
    return (
      <CenteredContainer>
        <Text color="$danger" fontSize={16} marginBottom="$4">
          {error || 'Bill not found'}
        </Text>
        <ActionButton
          backgroundColor="$primary"
          onPress={() => navigation.goBack()}
        >
          <Text color="white" fontWeight="600">Go Back</Text>
        </ActionButton>
      </CenteredContainer>
    );
  }

  return (
    <Container>
      <Header>
        <Button
          unstyled
          padding="$1"
          onPress={() => navigation.goBack()}
        >
          <Text color="$primary" fontSize={16}>← Back</Text>
        </Button>
        <Button
          unstyled
          padding="$1"
          onPress={handleEdit}
        >
          <Text color="$primary" fontSize={16} fontWeight="600">Edit</Text>
        </Button>
      </Header>
      <HeaderTitle>{bill.name}</HeaderTitle>

      <ScrollView flex={1} padding="$4">
        {/* Bill Info Card */}
        <Card>
          <CardRow>
            <Label>Amount</Label>
            <Value color={bill.type === 'deposit' ? '$success' : '$danger'}>
              {bill.type === 'deposit' ? '+' : '-'}{formatCurrency(bill.amount)}
            </Value>
          </CardRow>
          <CardRow>
            <Label>Next Due</Label>
            <Value>{formatDate(bill.next_due)}</Value>
          </CardRow>
          <CardRow>
            <Label>Frequency</Label>
            <Value>{bill.frequency}</Value>
          </CardRow>
          <CardRow>
            <Label>Type</Label>
            <Value>{bill.type === 'deposit' ? 'Income' : 'Expense'}</Value>
          </CardRow>
          {bill.account && (
            <CardRow>
              <Label>Account</Label>
              <Value>{bill.account}</Value>
            </CardRow>
          )}
          <CardRow>
            <Label>Auto-Pay</Label>
            <Value>{bill.auto_payment ? 'Yes' : 'No'}</Value>
          </CardRow>
          {bill.notes && (
            <YStack padding="$4">
              <Label>Notes</Label>
              <Text color="$textMuted" marginTop="$2" fontSize={14}>
                {bill.notes}
              </Text>
            </YStack>
          )}
        </Card>

        {/* Action Buttons */}
        <XStack gap="$3" marginVertical="$5">
          <ActionButton
            flex={2}
            backgroundColor="$primary"
            onPress={() => setShowPayModal(true)}
          >
            <Text color="white" fontSize={16} fontWeight="600">
              Record Payment
            </Text>
          </ActionButton>
          <ActionButton
            flex={1}
            backgroundColor="$border"
            onPress={handleArchive}
          >
            <Text color="$textMuted" fontSize={16} fontWeight="600">
              Archive
            </Text>
          </ActionButton>
        </XStack>

        {/* Payment History */}
        <SectionTitle>Payment History</SectionTitle>
        {payments.length === 0 ? (
          <Card padding="$6" alignItems="center">
            <Text color="$textMuted" fontSize={14}>
              No payments recorded yet
            </Text>
          </Card>
        ) : (
          <Card>
            {payments.slice(0, 10).map((payment) => (
              <PaymentRow key={payment.id}>
                <YStack>
                  <Text color="$text" fontSize={14}>
                    {formatDate(payment.payment_date)}
                  </Text>
                  {payment.notes && (
                    <Text color="$textMuted" fontSize={12} marginTop="$1">
                      {payment.notes}
                    </Text>
                  )}
                </YStack>
                <Text color="$text" fontSize={16} fontWeight="600">
                  {formatCurrency(payment.amount)}
                </Text>
              </PaymentRow>
            ))}
          </Card>
        )}

        <YStack height={40} />
      </ScrollView>

      {/* Pay Modal */}
      <RNModal
        visible={showPayModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPayModal(false)}
      >
        <ModalOverlay>
          <ModalContent>
            <Text fontSize={22} fontWeight="bold" textAlign="center" color="$text">
              Record Payment
            </Text>
            <Text fontSize={14} textAlign="center" color="$textMuted" marginBottom="$6">
              {bill.name}
            </Text>

            <Text fontSize={14} color="$textMuted" marginBottom="$2">
              Amount
            </Text>
            <ModalInput
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="$textMuted"
            />

            <XStack gap="$3">
              <ActionButton
                flex={1}
                backgroundColor="$border"
                onPress={() => setShowPayModal(false)}
                disabled={isSubmitting}
              >
                <Text color="$text" fontSize={16} fontWeight="600">
                  Cancel
                </Text>
              </ActionButton>
              <ActionButton
                flex={1}
                backgroundColor="$primary"
                onPress={handlePay}
                disabled={isSubmitting}
                opacity={isSubmitting ? 0.7 : 1}
              >
                {isSubmitting ? (
                  <Spinner color="white" size="small" />
                ) : (
                  <Text color="white" fontSize={16} fontWeight="600">
                    Record
                  </Text>
                )}
              </ActionButton>
            </XStack>
          </ModalContent>
        </ModalOverlay>
      </RNModal>
    </Container>
  );
}
