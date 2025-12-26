import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import * as api from '../api/client';

export interface AppConfig {
  deployment_mode: 'saas' | 'self-hosted';
  billing_enabled: boolean;
  registration_enabled: boolean;
  email_enabled: boolean;
  email_verification_required: boolean;
}

interface ConfigContextType {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
  isSaas: boolean;
  isSelfHosted: boolean;
  emailEnabled: boolean;
}

const defaultConfig: AppConfig = {
  deployment_mode: 'self-hosted',
  billing_enabled: false,
  registration_enabled: false,
  email_enabled: false,
  email_verification_required: false,
};

const ConfigContext = createContext<ConfigContextType>({
  config: null,
  loading: true,
  error: null,
  isSaas: false,
  isSelfHosted: true,
  emailEnabled: false,
});

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.getAppConfig();
        if (response.data.success) {
          setConfig(response.data.data);
        } else {
          // Fall back to default if API fails
          setConfig(defaultConfig);
        }
      } catch (err) {
        console.error('Failed to fetch app config:', err);
        // Fall back to default config on error
        setConfig(defaultConfig);
        setError('Failed to load configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const value: ConfigContextType = {
    config,
    loading,
    error,
    isSaas: config?.deployment_mode === 'saas',
    isSelfHosted: config?.deployment_mode === 'self-hosted',
    emailEnabled: config?.email_enabled ?? false,
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
