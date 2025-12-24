import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Alert } from 'react-native';
import {
  YStack,
  H1,
  Text,
  Button,
  Input,
  Spinner,
  styled,
} from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const Container = styled(YStack, {
  flex: 1,
  backgroundColor: '$background',
});

const Content = styled(YStack, {
  flex: 1,
  justifyContent: 'center',
  paddingHorizontal: '$8',
});

const Title = styled(H1, {
  textAlign: 'center',
  marginBottom: '$2',
  color: '$text',
});

const Subtitle = styled(Text, {
  textAlign: 'center',
  marginBottom: '$10',
  color: '$textMuted',
  fontSize: 16,
});

const ErrorBox = styled(YStack, {
  backgroundColor: '$danger',
  padding: '$3',
  borderRadius: '$2',
  marginBottom: '$4',
});

const ErrorText = styled(Text, {
  color: 'white',
  textAlign: 'center',
});

const StyledInput = styled(Input, {
  backgroundColor: '$surface',
  borderColor: '$border',
  borderWidth: 1,
  borderRadius: '$2',
  paddingHorizontal: '$4',
  paddingVertical: '$4',
  fontSize: 16,
  color: '$text',
  marginBottom: '$4',

  focusStyle: {
    borderColor: '$primary',
  },
});

const LoginButton = styled(Button, {
  backgroundColor: '$primary',
  borderRadius: '$2',
  paddingVertical: '$4',
  marginTop: '$2',

  pressStyle: {
    opacity: 0.8,
  },

  variants: {
    loading: {
      true: {
        opacity: 0.7,
      },
    },
  } as const,
});

const InfoButton = styled(Button, {
  marginTop: '$6',
  backgroundColor: 'transparent',
  borderWidth: 0,
});

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await login(username.trim(), password);

    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Login failed');
    }
  };

  const showApiInfo = () => {
    Alert.alert(
      'API Configuration',
      `Connecting to:\n${api.getBaseUrl()}\n\nFor local testing, make sure the Flask server is running.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Container>
        <Content>
          <Title>BillManager</Title>
          <Subtitle>Track your finances</Subtitle>

          {error && (
            <ErrorBox>
              <ErrorText>{error}</ErrorText>
            </ErrorBox>
          )}

          <StyledInput
            placeholder="Username"
            placeholderTextColor="$textMuted"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />

          <StyledInput
            placeholder="Password"
            placeholderTextColor="$textMuted"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
            onSubmitEditing={handleLogin}
          />

          <LoginButton
            loading={isLoading}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <Spinner color="white" />
            ) : (
              <Text color="white" fontSize={18} fontWeight="600">
                Sign In
              </Text>
            )}
          </LoginButton>

          <InfoButton onPress={showApiInfo}>
            <Text color="$textMuted" fontSize={14}>
              API Info
            </Text>
          </InfoButton>
        </Content>
      </Container>
    </KeyboardAvoidingView>
  );
}
