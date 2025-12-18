import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Title,
  Text,
  Button,
  Stack,
  Alert,
  Badge,
  Group,
  Card,
  List,
  Loader,
  Center,
} from '@mantine/core';
import {
  IconCreditCard,
  IconCheck,
  IconAlertCircle,
  IconCrown,
  IconCalendar,
} from '@tabler/icons-react';
import * as api from '../api/client';
import type { SubscriptionStatus } from '../api/client';

export function Billing() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await api.getSubscriptionStatus();
      setStatus(response.data);
    } catch {
      setError('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setActionLoading(true);
    try {
      const response = await api.createCheckoutSession();
      if (response.data.success && response.data.url) {
        window.location.href = response.data.url;
      } else {
        setError(response.data.error || 'Failed to create checkout session');
      }
    } catch {
      setError('Failed to start subscription process');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManage = async () => {
    setActionLoading(true);
    try {
      const response = await api.createPortalSession();
      if (response.data.success && response.data.url) {
        window.location.href = response.data.url;
      } else {
        setError(response.data.error || 'Failed to open billing portal');
      }
    } catch {
      setError('Failed to open billing portal');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Container size="sm" my={40}>
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  const getStatusBadge = () => {
    if (!status?.has_subscription) {
      if (status?.in_trial) {
        return <Badge color="blue" size="lg">Free Trial</Badge>;
      }
      return <Badge color="gray" size="lg">No Subscription</Badge>;
    }

    switch (status.status) {
      case 'active':
        return <Badge color="green" size="lg">Active</Badge>;
      case 'trialing':
        return <Badge color="blue" size="lg">Trial</Badge>;
      case 'past_due':
        return <Badge color="yellow" size="lg">Past Due</Badge>;
      case 'canceled':
        return <Badge color="red" size="lg">Canceled</Badge>;
      default:
        return <Badge color="gray" size="lg">{status.status}</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Container size="sm" my={40}>
      <Title ta="center" mb="lg">Billing & Subscription</Title>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" mb="lg">
          {error}
        </Alert>
      )}

      <Paper withBorder shadow="md" p="lg" radius="md" mb="lg">
        <Group justify="space-between" mb="md">
          <Group>
            <IconCreditCard size={24} />
            <Title order={3}>Current Plan</Title>
          </Group>
          {getStatusBadge()}
        </Group>

        {status?.in_trial && status.trial_days_remaining !== undefined && (
          <Alert icon={<IconCalendar size={16} />} color="blue" variant="light" mb="md">
            You have {status.trial_days_remaining} days remaining in your free trial.
            {status.trial_days_remaining <= 3 && ' Subscribe now to keep your data!'}
          </Alert>
        )}

        {status?.cancel_at_period_end && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow" variant="light" mb="md">
            Your subscription will end on {formatDate(status.current_period_end)}.
            You can resubscribe at any time.
          </Alert>
        )}

        <Stack gap="xs">
          {status?.has_subscription ? (
            <>
              <Group justify="space-between">
                <Text c="dimmed">Plan</Text>
                <Text fw={500}>{status.plan === 'early_adopter' ? 'Early Adopter' : status.plan}</Text>
              </Group>
              <Group justify="space-between">
                <Text c="dimmed">Status</Text>
                <Text fw={500} tt="capitalize">{status.status}</Text>
              </Group>
              {status.current_period_end && (
                <Group justify="space-between">
                  <Text c="dimmed">
                    {status.cancel_at_period_end ? 'Ends on' : 'Renews on'}
                  </Text>
                  <Text fw={500}>{formatDate(status.current_period_end)}</Text>
                </Group>
              )}
            </>
          ) : (
            <Text c="dimmed">
              {status?.in_trial
                ? 'You are currently on a free trial. Subscribe to continue after your trial ends.'
                : 'You do not have an active subscription.'}
            </Text>
          )}
        </Stack>

        <Group mt="lg">
          {status?.has_subscription ? (
            <Button
              leftSection={<IconCreditCard size={16} />}
              onClick={handleManage}
              loading={actionLoading}
            >
              Manage Subscription
            </Button>
          ) : (
            <Button
              leftSection={<IconCrown size={16} />}
              onClick={handleSubscribe}
              loading={actionLoading}
            >
              Subscribe Now
            </Button>
          )}
        </Group>
      </Paper>

      <Card withBorder shadow="sm" radius="md">
        <Card.Section withBorder inheritPadding py="xs">
          <Group justify="space-between">
            <Text fw={500}>Early Adopter Plan</Text>
            <Badge color="violet">$5/month</Badge>
          </Group>
        </Card.Section>

        <Card.Section inheritPadding py="md">
          <List
            spacing="sm"
            size="sm"
            icon={<IconCheck size={16} color="var(--mantine-color-green-6)" />}
          >
            <List.Item>Unlimited bills and income tracking</List.Item>
            <List.Item>Up to 5 family members (shared workspaces)</List.Item>
            <List.Item>Calendar view with due date tracking</List.Item>
            <List.Item>Payment history and analytics</List.Item>
            <List.Item>Auto-payment tracking</List.Item>
            <List.Item>Account-based organization</List.Item>
            <List.Item>Priority email support</List.Item>
          </List>
        </Card.Section>

        <Card.Section withBorder inheritPadding py="xs">
          <Text size="xs" c="dimmed">
            14-day free trial included. Cancel anytime.
          </Text>
        </Card.Section>
      </Card>

      <Text size="sm" c="dimmed" ta="center" mt="lg">
        Need help?{' '}
        <Text component={Link} to="/support" c="blue" inherit>
          Contact support
        </Text>
      </Text>
    </Container>
  );
}
