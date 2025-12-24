import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  YStack,
  XStack,
  Text,
  Button,
  Card,
  H1,
  H2,
  styled,
  Input,
} from 'tamagui';
import {
  IconUser,
  IconLock,
  IconAlertCircle,
  IconBrandGithub,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import * as api from '../api/client';

// Styled components
const GradientBackground = styled(YStack, {
  minHeight: '100vh',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)',
  padding: '$4',
});

const FormContainer = styled(Card, {
  width: '100%',
  maxWidth: 440,
  padding: '$6',
  borderRadius: '$3',
  backgroundColor: '$card',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 12,
});

const StyledInput = styled(Input, {
  backgroundColor: '$surface',
  borderColor: '$borderColor',
  borderWidth: 1,
  borderRadius: '$2',
  paddingHorizontal: '$4',
  paddingVertical: '$3',
  fontSize: 16,
  color: '$color',

  focusStyle: {
    borderColor: '$primary',
    outlineWidth: 0,
  },
});

const TabButton = styled(XStack, {
  flex: 1,
  paddingVertical: '$3',
  alignItems: 'center',
  justifyContent: 'center',
  borderBottomWidth: 2,
  cursor: 'pointer',

  variants: {
    active: {
      true: {
        borderBottomColor: '$primary',
      },
      false: {
        borderBottomColor: 'transparent',
      },
    },
  } as const,
});

const AlertBox = styled(XStack, {
  padding: '$3',
  borderRadius: '$2',
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  alignItems: 'center',
  gap: '$2',
});

const PasswordInputWrapper = styled(XStack, {
  position: 'relative',
  alignItems: 'center',
});

const TogglePasswordButton = styled(XStack, {
  position: 'absolute',
  right: 12,
  cursor: 'pointer',
  opacity: 0.6,
  hoverStyle: {
    opacity: 1,
  },
});

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
  if (strength < 30) return '#ef4444';
  if (strength < 60) return '#eab308';
  if (strength < 80) return '#3b82f6';
  return '#22c55e';
}

export function LoginTamagui() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { config } = useConfig();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  const registrationEnabled = config?.registration_enabled ?? false;

  // Login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup state
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

  const passwordStrength = getPasswordStrength(signupPassword);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('Username and password are required');
      return;
    }

    setLoginLoading(true);
    try {
      const result = await login(loginUsername, loginPassword);
      if (result.success) {
        navigate('/');
      } else {
        setLoginError('Invalid credentials');
      }
    } catch {
      setLoginError('Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const validateSignup = (): string | null => {
    if (!signupUsername.trim()) return 'Username is required';
    if (signupUsername.length < 3) return 'Username must be at least 3 characters';
    if (!signupEmail.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) return 'Invalid email address';
    if (!signupPassword) return 'Password is required';
    if (signupPassword.length < 8) return 'Password must be at least 8 characters';
    if (!/[a-z]/.test(signupPassword) || !/[A-Z]/.test(signupPassword)) {
      return 'Password must contain both uppercase and lowercase letters';
    }
    if (!/[0-9]/.test(signupPassword)) return 'Password must contain at least one number';
    if (signupPassword !== signupConfirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');

    const validationError = validateSignup();
    if (validationError) {
      setSignupError(validationError);
      return;
    }

    setSignupLoading(true);
    try {
      const response = await api.register({
        username: signupUsername,
        email: signupEmail,
        password: signupPassword,
      });
      if (response.data.success) {
        setSignupSuccess(true);
        window.umami?.track('user_registered');
      } else {
        setSignupError(response.data.error || 'Registration failed');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setSignupError(error.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setSignupLoading(false);
    }
  };

  if (signupSuccess) {
    return (
      <GradientBackground>
        <FormContainer>
          <YStack alignItems="center" gap="$4">
            <Text fontSize={48}>📧</Text>
            <H2 textAlign="center">Check Your Email</H2>
            <Text color="$textMuted" textAlign="center">
              We've sent a verification link to <Text fontWeight="600">{signupEmail}</Text>.
              Please check your inbox and click the link to activate your account.
            </Text>
            <Button
              onPress={() => { setSignupSuccess(false); setActiveTab('login'); }}
              backgroundColor="$primary"
              color="white"
              width="100%"
            >
              Back to Login
            </Button>
          </YStack>
        </FormContainer>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      {/* Logo and Title */}
      <YStack alignItems="center" marginBottom="$6" gap="$3">
        <img src="/logo_icon.svg" alt="BillManager" style={{ width: 100, height: 100 }} />
        <H1 color="white" fontSize={40} fontWeight="700">
          BillManager
        </H1>
        <Text color="white" fontSize={18} opacity={0.9}>
          Track your bills and income with ease
        </Text>
      </YStack>

      <FormContainer>
        {/* Tabs */}
        <XStack marginBottom="$5">
          <TabButton active={activeTab === 'login'} onPress={() => setActiveTab('login')}>
            <Text fontWeight={activeTab === 'login' ? '600' : '400'} color={activeTab === 'login' ? '$primary' : '$textMuted'}>
              Sign In
            </Text>
          </TabButton>
          {registrationEnabled && (
            <TabButton active={activeTab === 'signup'} onPress={() => setActiveTab('signup')}>
              <Text fontWeight={activeTab === 'signup' ? '600' : '400'} color={activeTab === 'signup' ? '$primary' : '$textMuted'}>
                Sign Up
              </Text>
            </TabButton>
          )}
        </XStack>

        {/* Login Tab */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin}>
            <YStack gap="$4">
              {loginError && (
                <AlertBox>
                  <IconAlertCircle size={16} color="#ef4444" />
                  <Text color="#ef4444" fontSize={14}>{loginError}</Text>
                </AlertBox>
              )}

              <YStack gap="$1">
                <Text fontSize={14} fontWeight="500" marginBottom="$1">Username</Text>
                <XStack alignItems="center">
                  <XStack position="absolute" left={12} zIndex={1}>
                    <IconUser size={16} color="#888" />
                  </XStack>
                  <StyledInput
                    flex={1}
                    paddingLeft={40}
                    placeholder="Enter your username"
                    value={loginUsername}
                    onChangeText={setLoginUsername}
                  />
                </XStack>
              </YStack>

              <YStack gap="$1">
                <Text fontSize={14} fontWeight="500" marginBottom="$1">Password</Text>
                <PasswordInputWrapper>
                  <XStack position="absolute" left={12} zIndex={1}>
                    <IconLock size={16} color="#888" />
                  </XStack>
                  <StyledInput
                    flex={1}
                    paddingLeft={40}
                    paddingRight={40}
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    secureTextEntry={!showLoginPassword}
                  />
                  <TogglePasswordButton onPress={() => setShowLoginPassword(!showLoginPassword)}>
                    {showLoginPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </TogglePasswordButton>
                </PasswordInputWrapper>
              </YStack>

              <XStack justifyContent="flex-end">
                <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
                  <Text color="$primary" fontSize={14}>Forgot password?</Text>
                </Link>
              </XStack>

              <Button
                backgroundColor="$primary"
                color="white"
                height={44}
                disabled={loginLoading}
                opacity={loginLoading ? 0.7 : 1}
              >
                {loginLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </YStack>
          </form>
        )}

        {/* Signup Tab */}
        {activeTab === 'signup' && registrationEnabled && (
          <form onSubmit={handleSignup}>
            <YStack gap="$4">
              {signupError && (
                <AlertBox>
                  <IconAlertCircle size={16} color="#ef4444" />
                  <Text color="#ef4444" fontSize={14}>{signupError}</Text>
                </AlertBox>
              )}

              <YStack gap="$1">
                <Text fontSize={14} fontWeight="500" marginBottom="$1">Username</Text>
                <XStack alignItems="center">
                  <XStack position="absolute" left={12} zIndex={1}>
                    <IconUser size={16} color="#888" />
                  </XStack>
                  <StyledInput
                    flex={1}
                    paddingLeft={40}
                    placeholder="Choose a username"
                    value={signupUsername}
                    onChangeText={setSignupUsername}
                  />
                </XStack>
              </YStack>

              <YStack gap="$1">
                <Text fontSize={14} fontWeight="500" marginBottom="$1">Email</Text>
                <StyledInput
                  placeholder="your@email.com"
                  value={signupEmail}
                  onChangeText={setSignupEmail}
                />
              </YStack>

              <YStack gap="$1">
                <Text fontSize={14} fontWeight="500" marginBottom="$1">Password</Text>
                <PasswordInputWrapper>
                  <XStack position="absolute" left={12} zIndex={1}>
                    <IconLock size={16} color="#888" />
                  </XStack>
                  <StyledInput
                    flex={1}
                    paddingLeft={40}
                    paddingRight={40}
                    placeholder="Create a strong password"
                    value={signupPassword}
                    onChangeText={setSignupPassword}
                    secureTextEntry={!showSignupPassword}
                  />
                  <TogglePasswordButton onPress={() => setShowSignupPassword(!showSignupPassword)}>
                    {showSignupPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </TogglePasswordButton>
                </PasswordInputWrapper>

                {signupPassword && (
                  <YStack marginTop="$2">
                    <XStack height={4} backgroundColor="$borderColor" borderRadius="$1" overflow="hidden">
                      <XStack
                        width={`${passwordStrength}%`}
                        backgroundColor={getPasswordColor(passwordStrength)}
                        borderRadius="$1"
                      />
                    </XStack>
                    <YStack marginTop="$2" gap="$1">
                      <Text fontSize={12} color={signupPassword.length >= 8 ? '#22c55e' : '$textMuted'}>
                        • At least 8 characters
                      </Text>
                      <Text fontSize={12} color={/[a-z]/.test(signupPassword) && /[A-Z]/.test(signupPassword) ? '#22c55e' : '$textMuted'}>
                        • Upper and lowercase letters
                      </Text>
                      <Text fontSize={12} color={/[0-9]/.test(signupPassword) ? '#22c55e' : '$textMuted'}>
                        • At least one number
                      </Text>
                    </YStack>
                  </YStack>
                )}
              </YStack>

              <YStack gap="$1">
                <Text fontSize={14} fontWeight="500" marginBottom="$1">Confirm Password</Text>
                <PasswordInputWrapper>
                  <XStack position="absolute" left={12} zIndex={1}>
                    <IconLock size={16} color="#888" />
                  </XStack>
                  <StyledInput
                    flex={1}
                    paddingLeft={40}
                    paddingRight={40}
                    placeholder="Confirm your password"
                    value={signupConfirmPassword}
                    onChangeText={setSignupConfirmPassword}
                    secureTextEntry={!showSignupConfirmPassword}
                  />
                  <TogglePasswordButton onPress={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}>
                    {showSignupConfirmPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </TogglePasswordButton>
                </PasswordInputWrapper>
                {signupConfirmPassword && signupPassword !== signupConfirmPassword && (
                  <Text color="#ef4444" fontSize={12} marginTop="$1">Passwords do not match</Text>
                )}
              </YStack>

              <Button
                backgroundColor="$primary"
                color="white"
                height={44}
                disabled={signupLoading}
                opacity={signupLoading ? 0.7 : 1}
              >
                {signupLoading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <Text fontSize={12} color="$textMuted" textAlign="center">
                By signing up, you agree to our{' '}
                <Text color="$primary" fontSize={12}>Terms</Text> and{' '}
                <Text color="$primary" fontSize={12}>Privacy Policy</Text>
              </Text>
            </YStack>
          </form>
        )}
      </FormContainer>

      {/* GitHub Footer */}
      <XStack marginTop="$6" alignItems="center" gap="$2">
        <Text color="white" fontSize={14} opacity={0.9}>Open source •</Text>
        <a
          href="https://github.com/brdweb/billmanager"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <IconBrandGithub size={16} color="white" />
          <Text color="white" fontSize={14} textDecorationLine="underline">View on GitHub</Text>
        </a>
      </XStack>
    </GradientBackground>
  );
}

export default LoginTamagui;
