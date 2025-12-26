import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useConfig } from '../context/ConfigContext';
import { api } from '../api/client';
import { AuthStackParamList } from '../navigation/AppNavigator';

const CLOUD_API_URL = 'https://app.billmanager.app/api/v2';
const LOCAL_DEV_URL = 'http://192.168.2.48:5001/api/v2';
const API_URL_KEY = 'billmanager_api_url';
const SERVER_TYPE_KEY = 'billmanager_server_type';

type ServerType = 'cloud' | 'self-hosted' | 'local-dev';

type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<AuthNavProp>();
  const { login } = useAuth();
  const { colors } = useTheme();
  const { emailEnabled } = useConfig();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Server selection state - default to local-dev in dev mode
  const [serverType, setServerType] = useState<ServerType>(__DEV__ ? 'local-dev' : 'cloud');
  const [customUrl, setCustomUrl] = useState('');
  const [showServerModal, setShowServerModal] = useState(false);
  const [tempServerType, setTempServerType] = useState<ServerType>(__DEV__ ? 'local-dev' : 'cloud');
  const [tempCustomUrl, setTempCustomUrl] = useState('');

  const styles = createStyles(colors);

  // Load saved server settings on mount
  useEffect(() => {
    loadServerSettings();
  }, []);

  const loadServerSettings = async () => {
    try {
      const savedType = await SecureStore.getItemAsync(SERVER_TYPE_KEY) as ServerType | null;
      const savedUrl = await SecureStore.getItemAsync(API_URL_KEY);

      if (savedType === 'self-hosted' && savedUrl) {
        setServerType('self-hosted');
        setCustomUrl(savedUrl);
        api.setBaseUrl(savedUrl);
      } else if (savedType === 'local-dev' && __DEV__) {
        setServerType('local-dev');
        api.setBaseUrl(LOCAL_DEV_URL);
      } else if (savedType === 'cloud') {
        setServerType('cloud');
        api.setBaseUrl(CLOUD_API_URL);
      } else {
        // Default based on environment
        if (__DEV__) {
          setServerType('local-dev');
          api.setBaseUrl(LOCAL_DEV_URL);
        } else {
          setServerType('cloud');
          api.setBaseUrl(CLOUD_API_URL);
        }
      }
    } catch (e) {
      // Use defaults based on environment
      if (__DEV__) {
        api.setBaseUrl(LOCAL_DEV_URL);
      } else {
        api.setBaseUrl(CLOUD_API_URL);
      }
    }
  };

  const saveServerSettings = async (type: ServerType, url: string) => {
    try {
      await SecureStore.setItemAsync(SERVER_TYPE_KEY, type);
      if (type === 'self-hosted') {
        await SecureStore.setItemAsync(API_URL_KEY, url);
        api.setBaseUrl(url);
      } else if (type === 'local-dev') {
        await SecureStore.deleteItemAsync(API_URL_KEY);
        api.setBaseUrl(LOCAL_DEV_URL);
      } else {
        await SecureStore.deleteItemAsync(API_URL_KEY);
        api.setBaseUrl(CLOUD_API_URL);
      }
    } catch (e) {
      console.error('Failed to save server settings:', e);
    }
  };

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

  const openServerModal = () => {
    setTempServerType(serverType);
    setTempCustomUrl(customUrl);
    setShowServerModal(true);
  };

  const saveServerSelection = () => {
    if (tempServerType === 'self-hosted' && !tempCustomUrl.trim()) {
      return; // Don't save if self-hosted but no URL
    }

    let url = CLOUD_API_URL;
    if (tempServerType === 'self-hosted') {
      url = tempCustomUrl.trim();
    } else if (tempServerType === 'local-dev') {
      url = LOCAL_DEV_URL;
    }

    setServerType(tempServerType);
    setCustomUrl(tempServerType === 'self-hosted' ? tempCustomUrl.trim() : '');
    saveServerSettings(tempServerType, url);
    setShowServerModal(false);
  };

  const getServerDisplayText = () => {
    if (serverType === 'cloud') {
      return 'BillManager Cloud';
    }
    if (serverType === 'local-dev') {
      return 'Local Development';
    }
    // Extract domain from custom URL
    try {
      const url = new URL(customUrl);
      return url.hostname;
    } catch {
      return customUrl || 'Self-hosted';
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Title */}
        <Text style={styles.title}>BillManager</Text>
        <Text style={styles.subtitle}>Track your finances</Text>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Username Input */}
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={colors.textMuted}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />

        {/* Password Input */}
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!isLoading}
          onSubmitEditing={handleLogin}
        />

        {/* Server Selection */}
        <TouchableOpacity
          style={styles.serverSelector}
          onPress={openServerModal}
          disabled={isLoading}
        >
          <Text style={styles.serverLabel}>Accessing: </Text>
          <Text style={styles.serverValue}>{getServerDisplayText()}</Text>
          <Text style={styles.serverArrow}> ▼</Text>
        </TouchableOpacity>

        {/* Sign In Button */}
        <TouchableOpacity
          style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signInButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Forgot Password Link - only shown when email is enabled */}
        {emailEnabled && (
          <TouchableOpacity
            style={styles.forgotPasswordLink}
            onPress={() => navigation.navigate('ForgotPassword')}
            disabled={isLoading}
          >
            <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Server Selection Modal */}
      <Modal
        visible={showServerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowServerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Server Selection</Text>

            {/* Cloud Option */}
            <TouchableOpacity
              style={[
                styles.serverOption,
                tempServerType === 'cloud' && styles.serverOptionActive,
              ]}
              onPress={() => setTempServerType('cloud')}
            >
              <View style={styles.radioOuter}>
                {tempServerType === 'cloud' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.serverOptionContent}>
                <Text style={styles.serverOptionTitle}>BillManager Cloud</Text>
                <Text style={styles.serverOptionSubtitle}>app.billmanager.app</Text>
              </View>
            </TouchableOpacity>

            {/* Self-hosted Option */}
            <TouchableOpacity
              style={[
                styles.serverOption,
                tempServerType === 'self-hosted' && styles.serverOptionActive,
              ]}
              onPress={() => setTempServerType('self-hosted')}
            >
              <View style={styles.radioOuter}>
                {tempServerType === 'self-hosted' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.serverOptionContent}>
                <Text style={styles.serverOptionTitle}>Self-hosted</Text>
                <Text style={styles.serverOptionSubtitle}>Connect to your own server</Text>
              </View>
            </TouchableOpacity>

            {/* Local Development Option (dev only) */}
            {__DEV__ && (
              <TouchableOpacity
                style={[
                  styles.serverOption,
                  tempServerType === 'local-dev' && styles.serverOptionActive,
                ]}
                onPress={() => setTempServerType('local-dev')}
              >
                <View style={styles.radioOuter}>
                  {tempServerType === 'local-dev' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.serverOptionContent}>
                  <Text style={styles.serverOptionTitle}>Local Development</Text>
                  <Text style={styles.serverOptionSubtitle}>192.168.2.48:5001</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Custom URL Input (shown when self-hosted selected) */}
            {tempServerType === 'self-hosted' && (
              <View style={styles.customUrlContainer}>
                <Text style={styles.customUrlLabel}>Server URL</Text>
                <TextInput
                  style={styles.customUrlInput}
                  placeholder="https://your-server.com/api"
                  placeholderTextColor={colors.textMuted}
                  value={tempCustomUrl}
                  onChangeText={setTempCustomUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>
            )}

            {/* Modal Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowServerModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSaveButton,
                  tempServerType === 'self-hosted' && !tempCustomUrl.trim() && styles.modalSaveButtonDisabled,
                ]}
                onPress={saveServerSelection}
                disabled={tempServerType === 'self-hosted' && !tempCustomUrl.trim()}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
  },
  errorBox: {
    backgroundColor: colors.danger,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  serverSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  serverLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  serverValue: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  serverArrow: {
    fontSize: 10,
    color: colors.primary,
  },
  signInButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  forgotPasswordLink: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 4,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  serverOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: 12,
  },
  serverOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  serverOptionContent: {
    flex: 1,
  },
  serverOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  serverOptionSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  customUrlContainer: {
    marginTop: 4,
    marginBottom: 16,
  },
  customUrlLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 8,
  },
  customUrlInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalSaveButtonDisabled: {
    opacity: 0.5,
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
