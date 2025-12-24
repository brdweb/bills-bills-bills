import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Title,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Alert,
  Text,
  Anchor,
  Progress,
  List,
} from '@mantine/core';
import { IconUser, IconMail, IconLock, IconAlertCircle, IconCheck } from '@tabler/icons-react';
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

export function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  const validateForm = (): string | null => {
    if (!username.trim()) return 'Username is required';
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (!email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email address';
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

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await api.register({ username, email, password });
      if (response.data.success) {
        setSuccess(true);
      } else {
        setError(response.data.error || 'Registration failed');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container size={420} my={40}>
        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <Stack align="center" gap="md">
            <IconCheck size={48} color="var(--mantine-color-green-6)" />
            <Title order={2} ta="center">Check Your Email</Title>
            <Text c="dimmed" ta="center">
              We&apos;ve sent a verification link to <strong>{email}</strong>.
              Please check your inbox and click the link to activate your account.
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Didn&apos;t receive the email? Check your spam folder or{' '}
              <Anchor component={Link} to={`/resend-verification?email=${encodeURIComponent(email)}`}>
                resend the verification email
              </Anchor>
            </Text>
            <Button variant="light" onClick={() => navigate('/login')}>
              Back to Login
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center">Create an Account</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Already have an account?{' '}
        <Anchor component={Link} to="/login" size="sm">
          Sign in
        </Anchor>
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
              label="Username"
              placeholder="Choose a username"
              leftSection={<IconUser size={16} />}
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
              required
            />

            <TextInput
              label="Email"
              placeholder="your@email.com"
              leftSection={<IconMail size={16} />}
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
            />

            <div>
              <PasswordInput
                label="Password"
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
              placeholder="Confirm your password"
              leftSection={<IconLock size={16} />}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.currentTarget.value)}
              error={confirmPassword && password !== confirmPassword ? 'Passwords do not match' : undefined}
              required
            />

            <Button type="submit" fullWidth loading={loading}>
              Create Account
            </Button>

            <Text size="xs" c="dimmed" ta="center">
              By creating an account, you agree to our{' '}
              <Anchor href="/terms" size="xs">Terms of Service</Anchor>
              {' '}and{' '}
              <Anchor href="/privacy" size="xs">Privacy Policy</Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
