import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Title,
  TextInput,
  Button,
  Stack,
  Alert,
  Text,
  Anchor,
} from '@mantine/core';
import { IconMail, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import * as api from '../api/client';

export function ResendVerification() {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await api.resendVerification(email);
      if (response.data.success) {
        setSuccess(true);
      } else {
        setError(response.data.error || 'Failed to resend verification email');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container size={420} my={40}>
        <Paper withBorder shadow="md" p={30} radius="md">
          <Stack align="center" gap="md">
            <IconCheck size={48} color="var(--mantine-color-green-6)" />
            <Title order={2} ta="center">Email Sent!</Title>
            <Text c="dimmed" ta="center">
              We&apos;ve sent a new verification link to <strong>{email}</strong>.
              Please check your inbox.
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              The link will expire in 24 hours.
            </Text>
            <Button component={Link} to="/login" variant="light">
              Back to Login
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center">Resend Verification</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Enter your email to receive a new verification link
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                {error}
              </Alert>
            )}

            <TextInput
              label="Email"
              placeholder="your@email.com"
              leftSection={<IconMail size={16} />}
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
            />

            <Button type="submit" fullWidth loading={loading}>
              Resend Verification Email
            </Button>

            <Text size="sm" ta="center">
              <Anchor component={Link} to="/login" size="sm">
                Back to login
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
