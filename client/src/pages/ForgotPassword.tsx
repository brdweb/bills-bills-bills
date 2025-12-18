import { useState } from 'react';
import { Link } from 'react-router-dom';
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

export function ForgotPassword() {
  const [email, setEmail] = useState('');
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
      const response = await api.forgotPassword(email);
      if (response.data.success) {
        setSuccess(true);
      } else {
        setError(response.data.error || 'Failed to send reset email');
      }
    } catch {
      // Always show success to prevent email enumeration
      setSuccess(true);
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
            <Title order={2} ta="center">Check Your Email</Title>
            <Text c="dimmed" ta="center">
              If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link.
              Please check your inbox.
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              The link will expire in 1 hour for security reasons.
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
      <Title ta="center">Forgot Password?</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Enter your email and we&apos;ll send you a reset link
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
              Send Reset Link
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
