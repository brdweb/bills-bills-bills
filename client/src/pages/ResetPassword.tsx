import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Title,
  PasswordInput,
  Button,
  Stack,
  Alert,
  Text,
  Progress,
  List,
} from '@mantine/core';
import { IconLock, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import * as api from '../api/client';

function getPasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 15;
  if (/[a-z]/.test(password)) strength += 15;
  if (/[A-Z]/.test(password)) strength += 15;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 15;
  return Math.min(100, strength);
}

function getPasswordColor(strength: number): string {
  if (strength < 30) return 'red';
  if (strength < 60) return 'yellow';
  if (strength < 80) return 'blue';
  return 'green';
}

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  const validatePassword = (): string | null => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
      return 'Password must contain both uppercase and lowercase letters';
    }
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid reset link. No token provided.');
      return;
    }

    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await api.resetPassword(token, password);
      if (response.data.success) {
        setSuccess(true);
      } else {
        setError(response.data.error || 'Password reset failed');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Password reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Container size={420} my={40}>
        <Paper withBorder shadow="md" p={30} radius="md">
          <Stack align="center" gap="md">
            <IconAlertCircle size={48} color="var(--mantine-color-red-6)" />
            <Title order={2} ta="center">Invalid Link</Title>
            <Text c="dimmed" ta="center">
              This password reset link is invalid or has expired.
            </Text>
            <Button component={Link} to="/forgot-password" fullWidth>
              Request New Reset Link
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  if (success) {
    return (
      <Container size={420} my={40}>
        <Paper withBorder shadow="md" p={30} radius="md">
          <Stack align="center" gap="md">
            <IconCheck size={48} color="var(--mantine-color-green-6)" />
            <Title order={2} ta="center">Password Reset!</Title>
            <Text c="dimmed" ta="center">
              Your password has been successfully reset.
              You can now sign in with your new password.
            </Text>
            <Button onClick={() => navigate('/login')} fullWidth>
              Sign In
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center">Reset Password</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Enter your new password below
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                {error}
              </Alert>
            )}

            <div>
              <PasswordInput
                label="New Password"
                placeholder="Create a strong password"
                leftSection={<IconLock size={16} />}
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
              />
              {password && (
                <>
                  <Progress
                    value={passwordStrength}
                    color={getPasswordColor(passwordStrength)}
                    size="xs"
                    mt={5}
                  />
                  <Text size="xs" c="dimmed" mt={5}>
                    Password requirements:
                  </Text>
                  <List size="xs" c="dimmed" spacing={0}>
                    <List.Item c={password.length >= 8 ? 'green' : undefined}>
                      At least 8 characters
                    </List.Item>
                    <List.Item c={/[a-z]/.test(password) && /[A-Z]/.test(password) ? 'green' : undefined}>
                      Upper and lowercase letters
                    </List.Item>
                    <List.Item c={/[0-9]/.test(password) ? 'green' : undefined}>
                      At least one number
                    </List.Item>
                  </List>
                </>
              )}
            </div>

            <PasswordInput
              label="Confirm Password"
              placeholder="Confirm your new password"
              leftSection={<IconLock size={16} />}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.currentTarget.value)}
              error={confirmPassword && password !== confirmPassword ? 'Passwords do not match' : undefined}
              required
            />

            <Button type="submit" fullWidth loading={loading}>
              Reset Password
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
