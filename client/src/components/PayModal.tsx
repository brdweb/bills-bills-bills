import { useState, useEffect } from 'react';
import {
  Modal,
  NumberInput,
  Switch,
  Button,
  Group,
  Stack,
  Text,
} from '@mantine/core';
import type { Bill } from '../api/client';

interface PayModalProps {
  opened: boolean;
  onClose: () => void;
  onPay: (amount: number, advanceDue: boolean) => Promise<void>;
  bill: Bill | null;
}

export function PayModal({ opened, onClose, onPay, bill }: PayModalProps) {
  const [amount, setAmount] = useState<number | ''>('');
  const [advanceDue, setAdvanceDue] = useState(true);
  const [loading, setLoading] = useState(false);

  const isDeposit = bill?.type === 'deposit';

  useEffect(() => {
    if (bill && opened) {
      setAmount(bill.amount || '');
      setAdvanceDue(true);
    }
  }, [bill, opened]);

  const handleSubmit = async () => {
    if (amount === '' || amount < 0) {
      return;
    }

    setLoading(true);
    try {
      await onPay(amount as number, advanceDue);
      window.umami?.track('payment_recorded', { type: isDeposit ? 'deposit' : 'expense' });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`${isDeposit ? 'Record' : 'Pay'}: ${bill?.name || 'Bill'}`}
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Record a {isDeposit ? 'deposit' : 'payment'} for this {isDeposit ? 'income' : 'bill'}.
        </Text>

        <NumberInput
          label={isDeposit ? 'Deposit Amount' : 'Payment Amount'}
          placeholder="0.00"
          prefix="$"
          decimalScale={2}
          fixedDecimalScale
          min={0}
          value={amount}
          onChange={(val) => setAmount(val === '' ? '' : Number(val))}
          description={bill?.varies ? `This ${isDeposit ? 'deposit' : 'bill'} has a variable amount` : undefined}
        />

        <Switch
          label="Advance due date"
          description={`Create the next recurring ${isDeposit ? 'deposit' : 'bill'}`}
          checked={advanceDue}
          onChange={(event) => setAdvanceDue(event.currentTarget.checked)}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color={isDeposit ? 'green' : 'blue'}
            onClick={handleSubmit}
            loading={loading}
            disabled={amount === '' || (typeof amount === 'number' && amount < 0)}
          >
            Record {isDeposit ? 'Deposit' : 'Payment'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
