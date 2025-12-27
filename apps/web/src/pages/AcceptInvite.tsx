import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
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
  Loader,
  Center,
} from '@mantine/core';
import { IconUser, IconLock, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { getInviteInfo, acceptInvite } from '../api/client';

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

export function AcceptInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Invite info
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitedBy, setInvitedBy] = useState('');
  const [inviteLoading, setInviteLoading] = useState(true);
  const [inviteError, setInviteError] = useState('');

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdUsername, setCreatedUsername] = useState('');

  const passwordStrength = getPasswordStrength(password);

  // Fetch invite info on mount
  useEffect(() => {
    if (!token) {
      setInviteError('Invalid invitation link. Please check the link and try again.');
      setInviteLoading(false);
      return;
    }

    const fetchInviteInfo = async () => {
      try {
        const response = await getInviteInfo(token);
        setInviteEmail(response.email);
        setInvitedBy(response.invited_by);
      } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: string } } };
        setInviteError(error.response?.data?.error || 'This invitation is invalid or has expired.');
      } finally {
        setInviteLoading(false);
      }
    };

    fetchInviteInfo();
  }, [token]);

  const validateForm = (): string | null => {
    if (!username.trim()) return 'Username is required';
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
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

    if (!token) {
      setError('Invalid invitation token');
      return;
    }

    setLoading(true);
    try {
      const response = await acceptInvite(token, username, password);
      setCreatedUsername(response.username);
      setSuccess(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (inviteLoading) {
    return (
      <Container size={420} my={40}>
        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <Center py="xl">
            <Stack align="center" gap="md">
              <Loader size="lg" />
              <Text c="dimmed">Loading invitation...</Text>
            </Stack>
          </Center>
        </Paper>
      </Container>
    );
  }

  // Invalid/expired invite
  if (inviteError) {
    return (
      <Container size={420} my={40}>
        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <Stack align="center" gap="md">
            <IconAlertCircle size={48} color="var(--mantine-color-red-6)" />
            <Title order={2} ta="center">Invalid Invitation</Title>
            <Text c="dimmed" ta="center">
              {inviteError}
            </Text>
            <Button variant="light" onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  // Success state
  if (success) {
    return (
      <Container size={420} my={40}>
        <Paper withBorder shadow="md" p={30} mt={30} radius="md">
          <Stack align="center" gap="md">
            <IconCheck size={48} color="var(--mantine-color-green-6)" />
            <Title order={2} ta="center">Account Created!</Title>
            <Text c="dimmed" ta="center">
              Your account has been created successfully. You can now sign in with your username{' '}
              <strong>{createdUsername}</strong>.
            </Text>
            <Button onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center">Accept Invitation</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        <strong>{invitedBy}</strong> has invited you to join BillManager
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
              value={inviteEmail}
              disabled
              description="Your account will be linked to this email"
            />

            <TextInput
              label="Username"
              placeholder="Choose a username"
              leftSection={<IconUser size={16} />}
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
              description="Letters, numbers, and underscores only"
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

            <Text size="sm" c="dimmed" ta="center">
              Already have an account?{' '}
              <Anchor component={Link} to="/login" size="sm">
                Sign in
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
