import React, { useState, useEffect } from 'react';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  YStack,
  XStack,
  Text,
  Button,
  Input,
  Switch,
  Spinner,
  ScrollView,
  TextArea,
  styled,
} from 'tamagui';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { Bill } from '../types';

type Props = NativeStackScreenProps<any, 'AddBill'>;

const FREQUENCY_OPTIONS = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Bi-weekly', value: 'biweekly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Yearly', value: 'yearly' },
  { label: 'One-time', value: 'once' },
];

// Styled components
const Container = styled(YStack, {
  flex: 1,
  backgroundColor: '$background',
});

const Header = styled(XStack, {
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '$5',
  paddingTop: 60,
  backgroundColor: '$surface',
});

const HeaderTitle = styled(Text, {
  fontSize: 18,
  fontWeight: '600',
  color: '$text',
});

const Label = styled(Text, {
  fontSize: 14,
  color: '$textMuted',
  marginBottom: '$2',
  marginTop: '$4',
});

const StyledInput = styled(Input, {
  backgroundColor: '$surface',
  borderColor: '$border',
  borderWidth: 1,
  borderRadius: '$2',
  padding: '$4',
  fontSize: 16,
  color: '$text',
});

const StyledTextArea = styled(TextArea, {
  backgroundColor: '$surface',
  borderColor: '$border',
  borderWidth: 1,
  borderRadius: '$2',
  padding: '$4',
  fontSize: 16,
  color: '$text',
  minHeight: 80,
});

const SelectButton = styled(Button, {
  paddingHorizontal: '$4',
  paddingVertical: '$2',
  borderRadius: '$2',
  borderWidth: 1,
  borderColor: '$border',
  backgroundColor: '$surface',

  variants: {
    active: {
      true: {
        backgroundColor: '$primary',
        borderColor: '$primary',
      },
    },
  } as const,
});

const TypeButton = styled(Button, {
  flex: 1,
  paddingVertical: '$3',
  borderRadius: '$2',
  borderWidth: 2,
  borderColor: '$border',
  backgroundColor: '$surface',

  variants: {
    type: {
      expense: {},
      deposit: {},
    },
    active: {
      true: {},
      false: {},
    },
  } as const,
});

const DateButton = styled(Button, {
  backgroundColor: '$surface',
  borderColor: '$border',
  borderWidth: 1,
  borderRadius: '$2',
  padding: '$4',
  justifyContent: 'flex-start',
});

const AccountChip = styled(Button, {
  paddingHorizontal: '$3',
  paddingVertical: '$1',
  borderRadius: 16,
  backgroundColor: '$border',
  marginRight: '$2',
});

// Type Toggle Component
function TypeToggle({
  value,
  onChange
}: {
  value: 'expense' | 'deposit';
  onChange: (v: 'expense' | 'deposit') => void;
}) {
  return (
    <XStack gap="$3">
      <TypeButton
        onPress={() => onChange('expense')}
        backgroundColor={value === 'expense' ? '$danger' : '$surface'}
        borderColor={value === 'expense' ? '$danger' : '$border'}
      >
        <Text
          color={value === 'expense' ? 'white' : '$textMuted'}
          fontSize={16}
          fontWeight={value === 'expense' ? '600' : '500'}
        >
          Expense
        </Text>
      </TypeButton>
      <TypeButton
        onPress={() => onChange('deposit')}
        backgroundColor={value === 'deposit' ? '$success' : '$surface'}
        borderColor={value === 'deposit' ? '$success' : '$border'}
      >
        <Text
          color={value === 'deposit' ? 'white' : '$textMuted'}
          fontSize={16}
          fontWeight={value === 'deposit' ? '600' : '500'}
        >
          Income
        </Text>
      </TypeButton>
    </XStack>
  );
}

// Select Buttons Component
function SelectButtons({
  options,
  value,
  onChange
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <XStack flexWrap="wrap" gap="$2">
      {options.map((option) => (
        <SelectButton
          key={option.value}
          active={value === option.value}
          onPress={() => onChange(option.value)}
        >
          <Text
            color={value === option.value ? 'white' : '$textMuted'}
            fontSize={14}
            fontWeight={value === option.value ? '600' : '400'}
          >
            {option.label}
          </Text>
        </SelectButton>
      ))}
    </XStack>
  );
}

export default function AddBillScreen({ navigation, route }: Props) {
  const editBill = route.params?.bill as Bill | undefined;
  const isEditing = !!editBill;
  const { isDark } = useTheme();

  const [name, setName] = useState(editBill?.name || '');
  const [amount, setAmount] = useState(editBill?.amount?.toString() || '');
  const [varies, setVaries] = useState(editBill?.varies || false);
  const [frequency, setFrequency] = useState(editBill?.frequency || 'monthly');
  const [nextDue, setNextDue] = useState<Date>(() => {
    if (editBill?.next_due) {
      return new Date(editBill.next_due + 'T00:00:00');
    }
    return new Date();
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [type, setType] = useState<'expense' | 'deposit'>(editBill?.type || 'expense');
  const [account, setAccount] = useState(editBill?.account || '');
  const [notes, setNotes] = useState(editBill?.notes || '');
  const [autoPayment, setAutoPayment] = useState(editBill?.auto_payment || false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<string[]>([]);

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    try {
      const response = await api.getBills();
      if (response.success && response.data) {
        const uniqueAccounts = [...new Set(
          response.data
            .map(b => b.account)
            .filter((a): a is string => !!a)
        )];
        setAccounts(uniqueAccounts);
      }
    } catch (err) {
      // Ignore
    }
  }

  function formatDateForDisplay(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatDateForApi(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setNextDue(selectedDate);
    }
  };

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a bill name');
      return;
    }

    if (!varies && !amount) {
      Alert.alert('Error', 'Please enter an amount or mark as variable');
      return;
    }

    setIsSubmitting(true);

    const billData: Partial<Bill> = {
      name: name.trim(),
      amount: varies ? null : parseFloat(amount),
      varies,
      frequency,
      next_due: formatDateForApi(nextDue),
      type,
      account: account.trim() || null,
      notes: notes.trim() || null,
      auto_payment: autoPayment,
    };

    try {
      let result;
      if (isEditing && editBill) {
        result = await api.updateBill(editBill.id, billData);
      } else {
        result = await api.createBill(billData);
      }

      if (result.success) {
        navigation.goBack();
      } else {
        Alert.alert('Error', result.error || 'Failed to save bill');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Container>
        <Header>
          <Button unstyled padding="$1" onPress={() => navigation.goBack()}>
            <Text color="$textMuted" fontSize={16}>Cancel</Text>
          </Button>
          <HeaderTitle>{isEditing ? 'Edit Bill' : 'New Bill'}</HeaderTitle>
          <Button
            unstyled
            padding="$1"
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Spinner color="$primary" size="small" />
            ) : (
              <Text color="$primary" fontSize={16} fontWeight="600">Save</Text>
            )}
          </Button>
        </Header>

        <ScrollView flex={1} padding="$4" keyboardShouldPersistTaps="handled">
          {/* Type */}
          <Label>Type</Label>
          <TypeToggle value={type} onChange={setType} />

          {/* Name */}
          <Label>Name</Label>
          <StyledInput
            value={name}
            onChangeText={setName}
            placeholder="e.g., Electric Bill"
            placeholderTextColor="$textMuted"
          />

          {/* Amount */}
          <XStack gap="$4">
            <YStack flex={1}>
              <Label>Amount</Label>
              <StyledInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="$textMuted"
                editable={!varies}
                opacity={varies ? 0.5 : 1}
              />
            </YStack>
            <YStack alignItems="center" justifyContent="flex-end" paddingBottom="$2">
              <Label>Variable</Label>
              <Switch
                checked={varies}
                onCheckedChange={setVaries}
                backgroundColor={varies ? '$primary' : '$border'}
              >
                <Switch.Thumb animation="quick" backgroundColor="white" />
              </Switch>
            </YStack>
          </XStack>

          {/* Frequency */}
          <Label>Frequency</Label>
          <SelectButtons
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={setFrequency}
          />

          {/* Next Due Date */}
          <Label>Next Due Date</Label>
          <DateButton onPress={() => setShowDatePicker(true)}>
            <Text color="$text" fontSize={16}>{formatDateForDisplay(nextDue)}</Text>
          </DateButton>

          {showDatePicker && (
            <DateTimePicker
              value={nextDue}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              themeVariant={isDark ? 'dark' : 'light'}
            />
          )}

          {Platform.OS === 'ios' && showDatePicker && (
            <Button
              unstyled
              alignSelf="flex-end"
              paddingVertical="$2"
              onPress={() => setShowDatePicker(false)}
            >
              <Text color="$primary" fontSize={16} fontWeight="600">Done</Text>
            </Button>
          )}

          {/* Account */}
          <Label>Account (optional)</Label>
          <StyledInput
            value={account}
            onChangeText={setAccount}
            placeholder="e.g., Chase Checking"
            placeholderTextColor="$textMuted"
          />
          {accounts.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} marginTop="$2">
              <XStack>
                {accounts.map((acc) => (
                  <AccountChip key={acc} onPress={() => setAccount(acc)}>
                    <Text color="$textMuted" fontSize={12}>{acc}</Text>
                  </AccountChip>
                ))}
              </XStack>
            </ScrollView>
          )}

          {/* Auto-payment */}
          <XStack justifyContent="space-between" alignItems="center" marginTop="$4" paddingVertical="$2">
            <Text fontSize={14} color="$textMuted">Auto-payment enabled</Text>
            <Switch
              checked={autoPayment}
              onCheckedChange={setAutoPayment}
              backgroundColor={autoPayment ? '$primary' : '$border'}
            >
              <Switch.Thumb animation="quick" backgroundColor="white" />
            </Switch>
          </XStack>

          {/* Notes */}
          <Label>Notes (optional)</Label>
          <StyledTextArea
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional notes..."
            placeholderTextColor="$textMuted"
            numberOfLines={3}
          />

          <YStack height={40} />
        </ScrollView>
      </Container>
    </KeyboardAvoidingView>
  );
}
